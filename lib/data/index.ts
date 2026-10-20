import { stubStore } from "./stub";
import { supabaseStore } from "./supabase";
import { usingStub } from "./mode";

export const store = usingStub() ? stubStore : supabaseStore;
export const getMenu = () => store.getMenu();
