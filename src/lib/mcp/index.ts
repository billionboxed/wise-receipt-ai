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

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "transferred-smart-expense-manager",
  title: "Transferred Smart Expense Manager",
  version: "0.1.0",
  instructions:
    "ClearSpends expense tracker for the signed-in user. Call get_overview first to learn account, category (Main > Sub) and tag IDs. Use list_expenses and spending_summary for analysis. Every expense needs a category and an account. Confirm with the user before deleting. SMS scanning itself only runs in the Android app; here you can manage SMS drafts and identifiers.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getOverview, listExpenses, spendingSummary, listRecurring,
    addExpense, updateExpense, deleteExpenses,
    manageAccount, manageCategory, manageTag, manageSmsIdentifier,
    listSmsDrafts, confirmSmsDraft, updateSmsDraft,
  ],
});
