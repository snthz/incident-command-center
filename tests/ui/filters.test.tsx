import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncidentFiltersBar } from "@/features/incidents/filters";

const replace = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => currentParams,
}));

describe("IncidentFiltersBar", () => {
  beforeEach(() => {
    replace.mockReset();
    currentParams = new URLSearchParams();
  });

  it("keeps the search collapsed to an icon until clicked", async () => {
    const user = userEvent.setup();
    render(<IncidentFiltersBar filters={{}} />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Search incidents" }));
    expect(screen.getByRole("searchbox", { name: "Search incidents" })).toHaveFocus();
  });

  it("debounces typing into a single URL replace", async () => {
    const user = userEvent.setup();
    render(<IncidentFiltersBar filters={{}} />);
    await user.click(screen.getByRole("button", { name: "Search incidents" }));
    await user.type(screen.getByRole("searchbox"), "db down");
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/dashboard?q=db+down", { scroll: false });
    });
  });

  it("applies a status filter through the custom select", async () => {
    const user = userEvent.setup();
    render(<IncidentFiltersBar filters={{}} />);
    await user.click(screen.getByRole("combobox", { name: "Filter by status" }));
    await user.click(screen.getByRole("option", { name: "Resolved" }));
    expect(replace).toHaveBeenCalledWith("/dashboard?status=resolved", {
      scroll: false,
    });
  });

  it("applies a severity filter from the funnel icon select", async () => {
    const user = userEvent.setup();
    render(<IncidentFiltersBar filters={{}} />);
    await user.click(screen.getByRole("combobox", { name: "Filter by severity" }));
    await user.click(screen.getByRole("option", { name: "Critical" }));
    expect(replace).toHaveBeenCalledWith("/dashboard?severity=critical", {
      scroll: false,
    });
  });

  it("clears every filter at once", async () => {
    currentParams = new URLSearchParams("status=investigating&severity=high&q=db");
    const user = userEvent.setup();
    render(
      <IncidentFiltersBar
        filters={{ status: "investigating", severity: "high", q: "db" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(replace).toHaveBeenCalledWith("/dashboard", { scroll: false });
  });

  it("collapses the search again when it loses focus while empty", async () => {
    const user = userEvent.setup();
    render(<IncidentFiltersBar filters={{}} />);
    await user.click(screen.getByRole("button", { name: "Search incidents" }));
    await user.tab();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
