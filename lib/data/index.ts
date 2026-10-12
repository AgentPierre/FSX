import { stubStore } from "./stub";

// Swap for the Supabase-backed store once the schema is approved (12 Oct).
export const store = stubStore;
export const getMenu = () => store.getMenu();
