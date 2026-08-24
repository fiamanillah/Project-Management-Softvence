import { z } from "zod";

export const rabbitmqSchema = z.object({
  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_USER: z.string().default("guest"),
  RABBITMQ_PASS: z.string().default("guest"),
});

export type RabbitMQEnv = z.infer<typeof rabbitmqSchema>;
