import { NextRequest } from "next/server";

export const isAuthorized = (request: NextRequest): boolean => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  return token === process.env.NEXT_BEARER_TOKEN;
};
