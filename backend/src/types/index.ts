export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    created_at: Date;
  }
  
  export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    updated_at: Date;
  }
  
  export interface Transaction {
    id: string;
    sender_id: string | null;
    receiver_id: string;
    amount: number;
    type: "credit" | "debit";
    description?: string;
    reference: string;
    status: "pending" | "success" | "failed";
    created_at: Date;
  }
  
  // User public data
  export interface SafeUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    created_at: Date;
  }
  
  export interface EligibleBank {
    code: string;
    name: string;
    slug: string;
  }

  export interface KarmaLookupResponse {
    status?: string;
    message?: string;
    data?: {
      karma_identity: string;
      amount_in_contention?: string;
      reason?: string | null;
      default_date?: string;
      karma_type?: { karma: string };
      karma_identity_type?: { identity_type: string };
      reporting_entity?: { name: string; email: string };
    };
    meta?: {
      cost: number;
      balance: number;
    };
  }

  // JWT payload
  export interface AuthPayload {
    userId: string;
    email: string;
  }
  
  // User request Info
  declare global {
    namespace Express {
      interface Request {
        user?: AuthPayload;
      }
    }
  }