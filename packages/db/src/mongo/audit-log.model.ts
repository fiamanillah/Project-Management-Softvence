import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLogActor {
  id?: string;
  email?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuditLogHttpContext {
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  requestId?: string;
  query?: Record<string, any>;
  params?: Record<string, any>;
  requestBody?: Record<string, any>;
}

export interface IAuditLogChanges {
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: Record<string, any>;
}

export interface IAuditLogDocument extends Document {
  auditId: string;
  module: string;
  action: string;
  entityTable: string;
  entityId: string;
  actor?: IAuditLogActor;
  onBehalfOfId?: string;
  httpContext?: IAuditLogHttpContext;
  changes?: IAuditLogChanges;
  metadata?: Record<string, any>;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    auditId: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    entityTable: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    actor: {
      id: { type: String, index: true },
      email: { type: String },
      role: { type: String },
      ipAddress: { type: String },
      userAgent: { type: String },
    },
    onBehalfOfId: { type: String, index: true },
    httpContext: {
      method: { type: String },
      path: { type: String },
      statusCode: { type: Number },
      durationMs: { type: Number },
      requestId: { type: String },
      query: { type: Schema.Types.Mixed },
      params: { type: Schema.Types.Mixed },
      requestBody: { type: Schema.Types.Mixed },
    },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
      diff: { type: Schema.Types.Mixed },
    },
    metadata: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
      index: true,
    },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    collection: "audit_logs",
  },
);

// Compound indexes for high performance querying
AuditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ entityTable: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ "actor.id": 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

// Text index for search functionality
AuditLogSchema.index({
  action: "text",
  module: "text",
  entityTable: "text",
  "actor.email": "text",
});

export const AuditLogModel: Model<IAuditLogDocument> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLogDocument>("AuditLog", AuditLogSchema);
