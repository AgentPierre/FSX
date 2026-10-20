import type { Database as GeneratedDatabase, Json } from "../database.types";

// Generated table types describe the deployed T23 schema. These three RPCs are added by
// the accompanying T25 migration; regenerate the full file once that migration is deployed.
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: {
      create_checkout_order: {
        Args: { p_order: Json; p_earliest_pickup_at: string };
        Returns: string;
      };
      attach_checkout_session: {
        Args: { p_order_id: string; p_session_id: string };
        Returns: undefined;
      };
      confirm_checkout_payment: {
        Args: { p_order_id: string; p_session_id: string };
        Returns: string;
      };
    };
  };
};
