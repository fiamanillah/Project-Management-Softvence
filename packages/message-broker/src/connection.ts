import amqp, { type ChannelModel, type Channel } from "amqplib";
import { Queues, Exchanges } from "./constants/queues";
import { AppLogger } from "@workspace/logger";

const logger = new AppLogger("MessageBroker");

export class MessageBroker {
  private static instance: MessageBroker;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): MessageBroker {
    if (!MessageBroker.instance) {
      MessageBroker.instance = new MessageBroker();
    }
    return MessageBroker.instance;
  }

  public async connect(
    url: string = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
  ): Promise<Channel> {
    if (this.channel) return this.channel;

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.channel) return this.channel;
    }

    this.isConnecting = true;
    try {
      this.connection = await amqp.connect(url);
      const createdChannel = await this.connection.createChannel();
      this.channel = createdChannel;

      this.connection.on("error", (err) => {
        logger.error("RabbitMQ connection error", { error: err });
        this.channel = null;
        this.connection = null;
      });

      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed");
        this.channel = null;
        this.connection = null;
      });

      await this.assertInfrastructure();
      logger.info("Connected to RabbitMQ & initialized queues successfully");
      return createdChannel;
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ", { error });
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private async assertInfrastructure(): Promise<void> {
    if (!this.channel) return;

    await this.channel.assertExchange(Exchanges.APP_EVENTS, "direct", {
      durable: true,
    });

    const queuesList = [Queues.AUDIT_LOGS, Queues.NOTIFICATIONS, Queues.EMAIL];
    for (const queue of queuesList) {
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, Exchanges.APP_EVENTS, queue);
    }
  }

  public getChannel(): Channel {
    if (!this.channel) {
      throw new Error(
        "RabbitMQ channel not initialized. Call connect() first.",
      );
    }
    return this.channel;
  }

  public async publishToQueue<T>(
    queueName: Queues,
    message: T,
  ): Promise<boolean> {
    const channel = await this.connect();
    const buffer = Buffer.from(JSON.stringify(message));
    return channel.sendToQueue(queueName, buffer, { persistent: true });
  }

  public async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}

export const messageBroker = MessageBroker.getInstance();
