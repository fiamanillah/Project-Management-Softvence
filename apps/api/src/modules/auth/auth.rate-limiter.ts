import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 mins
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many authentication requests. Please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
