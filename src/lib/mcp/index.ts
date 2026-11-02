import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getOverview from "./tools/get-overview";
import listExpenses from "./tools/list-expenses";
import spendingSummary from "./tools/spending-summary";
import addExpense from "./tools/add-expense";
import updateExpense from "./tools/update-expense";
import deleteExpenses from "./tools/delete-expenses";
import manageAccount from "./tools/manage-account";
import manageCategory from "./tools/manage-category";
import manageTag from "./tools/manage-tag";
import manageSmsIdentifier from "./tools/manage-sms-identifier";
import listSmsDrafts from "./tools/list-sms-drafts";
import confirmSmsDraft from "./tools/confirm-sms-draft";
import updateSmsDraft from "./tools/update-sms-draft";
import listRecurring from "./tools/list-recurring";
import getMemory from "./tools/get-memory";
import managePreference from "./tools/manage-preference";
import manageMerchantRule from "./tools/manage-merchant-rule";
import findDuplicatesTool from "./tools/find-duplicates";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "transferred-smart-expense-manager",
  title: "Transferred Smart Expense Manager",
  version: "0.1.0",
  instructions:
    "ClearSpends expense tracker for the signed-in user. ALWAYS call get_overview at the start of every chat: it returns account, category (Main > Sub) and tag IDs plus the user's saved memory. Follow every saved preference (e.g. if one says don't ask to confirm, add directly). If a merchant rule matches a receipt's merchant, use its category/account/tags without asking. When the user answers a question about category/account for a merchant, offer to remember it with manage_merchant_rule (save immediately if they say 'remember'). Save standing instructions with manage_preference. add_expense rejects duplicates (same date + whole amount); if it reports one, tell the user it's already recorded instead of re-adding. Every expense needs a category and an account. Confirm with the user before deleting. SMS scanning only runs in the Android app; here you can manage SMS drafts and identifiers.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getOverview, listExpenses, spendingSummary, listRecurring,
    addExpense, updateExpense, deleteExpenses,
    manageAccount, manageCategory, manageTag, manageSmsIdentifier,
    listSmsDrafts, confirmSmsDraft, updateSmsDraft,
    getMemory, managePreference, manageMerchantRule, findDuplicatesTool,
  ],
});
