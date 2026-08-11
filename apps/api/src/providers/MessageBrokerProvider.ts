import { InfrastructureProvider } from "@/core/InfrastructureProvider";
import { MessageBroker, messageBroker } from "@workspace/message-broker";

export class MessageBrokerProvider implements InfrastructureProvider<MessageBroker> {
  public name = "RabbitMQ Message Broker";

  constructor(
    private readonly url: string,
    private readonly broker: MessageBroker = messageBroker,
  ) {}

  public getClient(): MessageBroker {
    return this.broker;
  }

  public async connect(): Promise<void> {
    await this.broker.connect(this.url);
  }

  public async disconnect(): Promise<void> {
    await this.broker.close();
  }
}
