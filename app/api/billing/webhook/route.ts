// Fail closed until the owner's billing integration and signature verification
// are provisioned and tested. No incoming event can mutate an entitlement.
export function POST() {
  return Response.json(
    {
      error: {
        code: "BILLING_NOT_CONFIGURED",
        message: "Subscription processing is unavailable",
      },
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
