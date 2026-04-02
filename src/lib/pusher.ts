import PusherServer from "pusher"

const globalForPusher = global as unknown as { pusherServer: PusherServer }

export const pusherServer =
  globalForPusher.pusherServer ||
  new PusherServer({
    appId: process.env.PUSHER_APP_ID || "",
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
    secret: process.env.PUSHER_SECRET || "",
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
    useTLS: true,
  })

if (process.env.NODE_ENV !== "production") globalForPusher.pusherServer = pusherServer
