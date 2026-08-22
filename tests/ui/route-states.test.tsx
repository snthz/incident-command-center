import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardError from "@/app/(app)/dashboard/error";
import IncidentLoading from "@/app/(app)/incidents/[key]/loading";
import IncidentNotFound from "@/app/(app)/incidents/[key]/not-found";

describe("dashboard error boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hides the raw error and offers a retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <DashboardError
        error={Object.assign(new Error("ECONNREFUSED 127.0.0.1:54322"), {
          digest: "123",
        })}
        retry={retry}
      />,
    );
    expect(screen.getByText("We couldn't load the incidents")).toBeInTheDocument();
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("incident detail loading state", () => {
  it("announces loading politely and marks the region busy", () => {
    const { container } = render(<IncidentLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading incident…");
    expect(container.querySelector("[aria-busy]")).not.toBeNull();
  });
});

describe("incident not-found state", () => {
  it("explains the miss and links back to the dashboard", () => {
    render(<IncidentNotFound />);
    expect(
      screen.getByRole("heading", { name: "Incident not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to incidents" }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
