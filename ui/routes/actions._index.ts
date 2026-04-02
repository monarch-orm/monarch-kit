import { ObjectId } from "monarch-orm";
import { createAction, routeAction } from "react-router-action";
import { z } from "zod";
import { sessionStore } from "~/ui/session.server";

const changeLayout = createAction({
  schema: z.object({
    layout: z.enum(["list", "grid"]),
  }),
  async handler(ctx, { request }) {
    const session = await sessionStore.getSession(request.headers.get("Cookie"));
    session.set("overviewLayout", ctx.input.layout);

    return ctx.data(null, {
      status: 200,
      headers: {
        "Set-Cookie": await sessionStore.commitSession(session),
      },
    });
  },
});

const generateObjectId = createAction({
  async handler(ctx) {
    return ctx.data({ id: new ObjectId().toHexString() });
  },
});

export const action = routeAction({
  changeLayout,
  generateObjectId,
});
