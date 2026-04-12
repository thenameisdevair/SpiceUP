// __tests__/stores/toast.test.ts
import { useToastStore } from "@/stores/toast";

beforeEach(() => {
  useToastStore.setState({ message: "", variant: "info", visible: false });
});

describe("useToastStore", () => {
  it('initializes with visible false, empty message, variant "info"', () => {
    const state = useToastStore.getState();
    expect(state.visible).toBe(false);
    expect(state.message).toBe("");
    expect(state.variant).toBe("info");
  });

  it('show() sets message, visible true, defaults variant to "info"', () => {
    useToastStore.getState().show("Hello");
    const state = useToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.message).toBe("Hello");
    expect(state.variant).toBe("info");
  });

  it('show() with "error" variant sets variant correctly', () => {
    useToastStore.getState().show("Error!", "error");
    expect(useToastStore.getState().variant).toBe("error");
  });

  it('show() with "success" variant sets variant correctly', () => {
    useToastStore.getState().show("Done", "success");
    expect(useToastStore.getState().variant).toBe("success");
  });

  it("hide() sets visible false, message unchanged", () => {
    useToastStore.getState().show("Visible");
    useToastStore.getState().hide();

    const state = useToastStore.getState();
    expect(state.visible).toBe(false);
    expect(state.message).toBe("Visible"); // message preserved
  });
});
