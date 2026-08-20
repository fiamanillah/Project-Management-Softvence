// src/core/realtime/BaseSocketGateway.ts

import type { AuthenticatedSocket, RealtimeIoServer } from "./realtime.types";
import { AppLogger } from "@/core/logging/logger";

export interface ISocketGateway {
  readonly name: string;
  readonly namespace?: string;
  register(io: RealtimeIoServer, socket: AuthenticatedSocket): void;
  onDisconnect?(socket: AuthenticatedSocket): void | Promise<void>;
}

export abstract class BaseSocketGateway implements ISocketGateway {
  public abstract readonly name: string;
  public readonly namespace?: string;
  protected logger: AppLogger;

  constructor(gatewayName?: string) {
    this.logger = new AppLogger(gatewayName || this.constructor.name);
  }

  public abstract register(io: RealtimeIoServer, socket: AuthenticatedSocket): void;

  public onDisconnect?(socket: AuthenticatedSocket): void | Promise<void>;
}
