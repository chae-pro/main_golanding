"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LandingStatusControls({
  landingId,
  currentStatus,
}: {
  landingId: string;
  currentStatus: "draft" | "published" | "archived";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function changeStatus(nextStatus: "draft" | "published" | "archived") {
    await fetch(`/api/landings/${landingId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="link-row">
      {currentStatus !== "published" ? (
        <button
          className="primary-button"
          disabled={isPending}
          onClick={() => changeStatus("published")}
          type="button"
        >
          {isPending ? "Saving..." : "Publish"}
        </button>
      ) : (
        <button
          className="ghost-button"
          disabled={isPending}
          onClick={() => changeStatus("draft")}
          type="button"
        >
          {isPending ? "Saving..." : "Move To Draft"}
        </button>
      )}

      {currentStatus !== "archived" ? (
        <button
          className="ghost-button"
          disabled={isPending}
          onClick={() => changeStatus("archived")}
          type="button"
        >
          {isPending ? "Saving..." : "Archive"}
        </button>
      ) : null}
    </div>
  );
}
