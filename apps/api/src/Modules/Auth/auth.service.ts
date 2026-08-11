import { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";
import { publishAuditLog, publishNotification } from "@workspace/message-broker";

export class AuthServices {
  // 1. Initialize the contextual logger for this specific service
  private logger = new AppLogger("AuthServices");

  // 2. Use 'private readonly' so TypeScript automatically creates 'this.prisma'
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Example Use Case: Register a new user
   */
  public async register(
    email: string,
    firstName: string,
    lastName: string,
    passwordHash: string,
  ) {
    this.logger.info("Attempting to register user", { email });

    // 3. Business Logic & Database Interaction
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn("Registration failed: User already exists", { email });
      // Throw your custom AppError. The global error handler will catch this!
      throw new ConflictError("A user with this email already exists");
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        employee_id: `EMP-${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        designation_id: "00000000-0000-0000-0000-000000000000",
      },
    });

    this.logger.info("User registered successfully", { userId: newUser.id });

    // Push async events to RabbitMQ for background processing by apps/worker
    try {
      await publishAuditLog({
        entityTable: "users",
        entityId: newUser.id,
        action: "USER_REGISTERED",
        actorId: newUser.id,
        newPayload: { email: newUser.email, firstName: newUser.first_name, lastName: newUser.last_name },
      });

      await publishNotification({
        recipientId: newUser.id,
        type: "Mention",
        title: "Welcome to Project Management Softvence!",
        body: `Hello ${newUser.first_name}, your account has been successfully created.`,
        entityType: "User",
        entityId: newUser.id,
      });
    } catch (brokerError) {
      this.logger.error("Failed to publish RabbitMQ events", { error: brokerError });
      // We log the error but don't break HTTP response as user registration succeeded
    }

    return newUser;
  }
}
