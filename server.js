const http = require("http");
const Koa = require("koa");
const Router = require("koa-router");
const koaBody = require("koa-body");
const uuid = require("uuid");
const WS = require("ws");

const app = new Koa();
app.use(async (ctx, next) => {
  const origin = ctx.request.get("Origin");
  if (!origin) {
    return await next();
  }

  const headers = { "Access-Control-Allow-Origin": "*" };

  if (ctx.request.method !== "OPTIONS") {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get("Access-Control-Request-Method")) {
    ctx.response.set({
      ...headers,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH"
    });

    if (ctx.request.get("Access-Control-Request-Headers")) {
      ctx.response.set(
        "Access-Control-Allow-Headers",
        ctx.request.get("Access-Control-Request-Headers")
      );
    }

    ctx.response.status = 204;
  }
});

app.use(
  koaBody({
    text: true,
    urlencoded: true,
    multipart: true,
    json: true
  })
);

const router = new Router();
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

const clients = [];

router.get("/index", async (ctx, next) => {
  console.log("get index");
});

router.get("/users", async (ctx, next) => {
  console.log("get users");
  ctx.response.body = clients;
});

router.post("/users", async (ctx, next) => {
  clients.push({ ...ctx.request.body, id: uuid.v4() });
  ctx.response.status = 204;
});

router.delete("/users/:name", async (ctx, next) => {
  console.log(ctx.params.name);
  const index = clients.findIndex(({ name }) => name === ctx.params.name);
  if (index !== -1) {
    clients.splice(index, 1);
  }
  ctx.response.status = 204;
});

wsServer.on("connection", (ws, req) => {
  console.log("connected to server");

  ws.on("message", message => {
    console.log("message");
    [...wsServer.clients]
      .filter(o => {
        return o.readyState === WS.OPEN;
      })
      .forEach(o => o.send(message));
  });

  ws.on("close", message => {
    console.log("chat closed");
    [...wsServer.clients]
      .filter(o => {
        return o.readyState === WS.OPEN;
      })
      .forEach(o => o.send(JSON.stringify({ type: "delete user" })));
    ws.close();
  });

  [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify({ type: "add user" })));
});

app.use(router.routes()).use(router.allowedMethods());
const port = process.env.PORT || 7070;
server.listen(port);