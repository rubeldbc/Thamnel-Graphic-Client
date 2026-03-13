// Triple identity model matching Rust thamnel_core::identity serde output.

export interface NodeIdentity {
  id: string;
  bindingKey: string | null;
  displayName: string;
}
