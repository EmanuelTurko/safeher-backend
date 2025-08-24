import express, { Express, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/db";
import { authRouter } from "./routes/auth.router";
import { userRouter } from "./routes/user.router";
import { postRouter } from "./routes/post.router";
import { commentRouter } from "./routes/comment.router";
import { IncomingMessage, Server, ServerResponse } from "http";
import { twilioRouter } from "./routes/twilio.router";
import fs from "fs";
import https from "https";
import { notificationRouter } from "./routes/notification.routes";
import { helperRouter } from "./routes/helper.router";
import { messageRouter } from "./routes/message.router";
import callRouter from "./routes/call.router";
import { cleanupExpiredRequests } from "./controllers/helper.controller";
import { Server as SocketIOServer } from "socket.io";

//Load environment variables
require("dotenv").config();

export const appPromise = new Promise<[Express, Server<typeof IncomingMessage, typeof ServerResponse>]>(resolve => {
  return connectDB().then(() => {
    const app: Express = express();

    app.use(
      cors({
        origin: "http://localhost:5173",
        credentials: true,
      })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // serve static files
    app.use(express.static("uploads"));
    // app.use(express.static("client-dist"));

    app.get("/", (req: Request, res: Response) => {
      res.status(200).send({ message: "SafeHer API is running", status: "ok" });
    });

    // Make uploads directory accessible
    app.use("/uploads", express.static("uploads"));

    // Routes
    app.use("/api/auth", authRouter);
    app.use("/api/user", userRouter);
    app.use("/api/post", postRouter);
    app.use("/api/comment", commentRouter);
    app.use("/api/twilio", twilioRouter);
    app.use("/api/notifications", notificationRouter);
    app.use("/api/helper", helperRouter);
    app.use("/api/messages", messageRouter);
    app.use("/api/calls", callRouter);

    // Start Express server
    const isProd = process.env.NODE_ENV === "production";
    console.log(`Mode: ${process.env.NODE_ENV}`);

    // ניקוי בקשות ישנות כל 10 דקות
    setInterval(async () => {
      await cleanupExpiredRequests();
    }, 10 * 60 * 1000);

    let port: string | number;
    let server: Server<typeof IncomingMessage, typeof ServerResponse>;

    if (!isProd) {
      port = process.env.PORT || 3001;
      server = app.listen(port, () => {
        console.log("Press CTRL-C to stop\n");

        // Initialize WebSocket server
        const io = new SocketIOServer(server, {
          cors: {
            origin: "*",
            methods: ["GET", "POST"],
          },
        });

        // WebSocket event handlers
        io.on("connection", socket => {
          const userId = socket.handshake.query.userId as string;

          if (userId) {
            socket.join(userId);
            console.log(`User ${userId} connected to WebSocket`);
          }

          socket.on("helper_request", data => {
            // Broadcast to helpers
            data.helperIds.forEach((helperId: string) => {
              socket.to(helperId).emit("helper_request_received", data);
            });
          });

          socket.on("helper_response", data => {
            // Send to requester
            socket.to(data.requesterId).emit("helper_response_received", data);
          });

          socket.on("chat_message", data => {
            // Send to receiver
            socket.to(data.receiverId).emit("message_received", data);
          });

          socket.on("disconnect", () => {
            console.log(`User ${userId} disconnected from WebSocket`);
          });
        });

        console.log(`WebSocket server initialized on port ${port}`);
        resolve([app, server]);
      });
      console.log("App is running at http://localhost:%d in %s mode", port, process.env.NODE_ENV);
    } else {
      port = process.env.HTTPS_PORT || 3001;

      const options = {
        key: fs.readFileSync("./client-key.pem"),
        cert: fs.readFileSync("./client-cert.pem"),
      };
      server = https.createServer(options, app).listen(port);

      // Initialize WebSocket server for production
      const io = new SocketIOServer(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
      });

      // WebSocket event handlers (same as development)
      io.on("connection", socket => {
        const userId = socket.handshake.query.userId as string;

        if (userId) {
          socket.join(userId);
          console.log(`User ${userId} connected to WebSocket`);
        }

        socket.on("helper_request", data => {
          data.helperIds.forEach((helperId: string) => {
            socket.to(helperId).emit("helper_request_received", data);
          });
        });

        socket.on("helper_response", data => {
          socket.to(data.requesterId).emit("helper_response_received", data);
        });

        socket.on("chat_message", data => {
          socket.to(data.receiverId).emit("message_received", data);
        });

        socket.on("disconnect", () => {
          console.log(`User ${userId} disconnected from WebSocket`);
        });
      });

      console.log("App is running at http://localhost:%d in %s mode", port, process.env.NODE_ENV);
      resolve([app, server]);
    }
  });
});
