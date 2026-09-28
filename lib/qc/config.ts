/**
 * Quality Control & HACCP — record type definitions.
 *
 * Every tab of the SpiseUp HACCP workbook is one entry in RECORD_TYPES. The
 * forms, tables, monthly print report, flagging and due-date alerts are all
 * generated from these definitions, so adding a new QC check later means
 * adding one object here — no new page, no new table, no migration.
 *
 * Limits below come from the HACCP Plan (CCP-1 moisture ≤ 11%) or are common
 * dry-spice food-safety values. Adjust them here once you've confirmed them
 * against your own shelf-life / stability data.
 */

export const CCP_MOISTURE_LIMIT = 11; // % — CCP-1 critical limit (HACCP Plan §5)
export const WATER_ACTIVITY_MAX = 0.6; // Aw — below 0.6 microbial growth stops
export const STORAGE_HUMIDITY_MAX = 65; // % RH for dry ambient stores
export const STORAGE_TEMP_MAX_C = 30; // °C
export const DUE_SOON_DAYS = 14; // "due soon" window for calibration/audits/etc.

export type Data = Record<string, string | number>;

export type FieldType = "text" | "textarea" | "date" | "time" | "number" | "select";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  /** Autocomplete source: known batches / raw materials / finished products, or this field's own past values. */
  suggest?: "batches" | "materials" | "products" | "history";
  default?: string; // literal value, or "today" / "now"
  placeholder?: string;
  step?: string;
  full?: boolean; // span the full form width
  /** Keeps its value after "Save & add another" (dates, verifier names — same for a whole round of checks). */
  sticky?: boolean;
  /** Pre-fill this date field from the selected batch's production date. */
  fromBatchDate?: boolean;
};

export type Column = { label: string; render: (d: Data) => string };

export type GroupKey = "ccp" | "prp" | "issues";

export type CcpId = "CCP-1" | "CCP-2";

export type RecordTypeConfig = {
  key: string;
  label: string;
  icon: string;
  group: GroupKey;
  description: string;
  frequency: string;
  /** Which field is the record's date (becomes the indexed record_date column). */
  dateKey: string;
  batchKey?: string;
  /** Closable records: open until this date field is filled in. */
  closeKey?: string;
  /** Field holding the Pass/Fail/Accepted/Rejected decision. */
  resultKey?: string;
  failValues?: string[];
  /** If a limit is breached, force the result field to failValues[0] (used for CCP checks). */
  autoFail?: boolean;
  /** When a record is flagged, this field must explain what was done about it. */
  correctiveKey?: string;
  nilAllowed?: boolean;
  /** Flag on the hub if nothing has been logged for this many days (daily logs). */
  staleDays?: number;
  /** Recurring due-date tracking — latest record per `groupKey` is checked against `key`. */
  due?: { key: string; groupKey: string; noun: string };
  fields: Field[];
  columns?: Column[];
  /** Automatic limit checks → list of human-readable breaches. */
  check?: (d: Data) => string[];
  /** Extra validation on save → error message or null. */
  validate?: (d: Data) => string | null;
  ccpTag?: (d: Data) => CcpId | null;
};

// ---------------------------------------------------------------- helpers

export const str = (d: Data, k: string) => (d[k] === undefined || d[k] === null ? "" : String(d[k]).trim());
export const num = (d: Data, k: string): number | null => {
  const v = str(d, k);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const YN = ["Y", "N"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2026-09-05 → 05-Sep-2026 (same as the paper workbook). Locale-independent so print output never varies by browser. */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}-${MONTHS[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
}

export function fmtValue(f: Field, d: Data): string {
  const v = str(d, f.key);
  if (v === "") return "—";
  if (f.type === "date") return fmtDate(v);
  return v;
}

export function defaultColumns(cfg: RecordTypeConfig): Column[] {
  return cfg.fields.map((f) => ({ label: f.label, render: (d) => fmtValue(f, d) }));
}

export function columnsFor(cfg: RecordTypeConfig): Column[] {
  return cfg.columns ?? defaultColumns(cfg);
}

// ------------------------------------------------------------ record types

export const RECORD_TYPES: RecordTypeConfig[] = [
  // ---------------------------------------------------------------- CCP & product QC
  {
    key: "raw_material_qc",
    label: "Raw Material QC",
    icon: "🌶️",
    group: "ccp",
    description: "Incoming inspection of chili, salt and other raw materials before acceptance into stock.",
    frequency: "Every delivery",
    dateKey: "date_received",
    resultKey: "decision",
    failValues: ["Rejected", "Held"],
    correctiveKey: "remarks",
    fields: [
      { key: "date_received", label: "Date Received", type: "date", default: "today", required: true, sticky: true },
      { key: "material", label: "Material", type: "text", suggest: "materials", required: true, placeholder: "Dried chili" },
      { key: "supplier", label: "Supplier", type: "text", suggest: "history", required: true },
      { key: "lot_no", label: "Batch / Lot No.", type: "text", required: true, placeholder: "CHL-0903" },
      { key: "qty_received", label: "Qty Received", type: "text", required: true, placeholder: "50 kg" },
      {
        key: "visual_inspection",
        label: "Visual Inspection",
        type: "select",
        required: true,
        default: "Pass — no mould/foreign matter",
        options: ["Pass — no mould/foreign matter", "Fail — mould", "Fail — foreign matter", "Fail — other"],
      },
      { key: "moisture_pct", label: "Moisture (%)", type: "number", step: "0.1", placeholder: `spec < ${CCP_MOISTURE_LIMIT}` },
      { key: "quality_notes", label: "Other quality test notes", type: "text" },
      { key: "decision", label: "Accepted / Rejected", type: "select", required: true, default: "Accepted", options: ["Accepted", "Held", "Rejected"] },
      { key: "inspected_by", label: "Inspected By", type: "text", suggest: "history", required: true, sticky: true },
      { key: "remarks", label: "Remarks", type: "textarea", full: true },
    ],
    columns: [
      { label: "Date Received", render: (d) => fmtDate(str(d, "date_received")) },
      { label: "Material", render: (d) => str(d, "material") || "—" },
      { label: "Supplier", render: (d) => str(d, "supplier") || "—" },
      { label: "Batch / Lot No.", render: (d) => str(d, "lot_no") || "—" },
      { label: "Qty Received", render: (d) => str(d, "qty_received") || "—" },
      { label: "Visual Inspection", render: (d) => str(d, "visual_inspection") || "—" },
      {
        label: "Moisture / Quality Test Result",
        render: (d) => [num(d, "moisture_pct") !== null ? `Moisture ${str(d, "moisture_pct")}%` : "", str(d, "quality_notes")].filter(Boolean).join(" · ") || "—",
      },
      { label: "Accepted / Rejected", render: (d) => str(d, "decision") || "—" },
      { label: "Inspected By", render: (d) => str(d, "inspected_by") || "—" },
      { label: "Remarks", render: (d) => str(d, "remarks") || "—" },
    ],
    check: (d) => {
      const out: string[] = [];
      if (str(d, "visual_inspection").startsWith("Fail")) out.push("Visual inspection failed");
      const m = num(d, "moisture_pct");
      if (m !== null && m > CCP_MOISTURE_LIMIT) out.push(`Moisture ${m}% is above the ${CCP_MOISTURE_LIMIT}% limit`);
      return out;
    },
  },
  {
    key: "production_log",
    label: "Production Log",
    icon: "🏭",
    group: "ccp",
    description: "Each production run: what was made, from which raw material lots, by whom.",
    frequency: "Every production run",
    dateKey: "date",
    batchKey: "batch_number",
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true, sticky: true },
      { key: "batch_number", label: "Batch No.", type: "text", suggest: "batches", required: true, placeholder: "SPU-0905A" },
      { key: "product", label: "Product", type: "text", suggest: "products", required: true },
      { key: "raw_material_lots", label: "Raw Material Lot(s) Used", type: "text", required: true, placeholder: "CHL-0903 / SLT-0810" },
      { key: "qty_produced", label: "Qty Produced", type: "text", required: true, placeholder: "300 units" },
      { key: "start_time", label: "Start Time", type: "time" },
      { key: "end_time", label: "End Time", type: "time" },
      { key: "operator", label: "Operator", type: "text", suggest: "history", required: true },
      { key: "supervisor_signoff", label: "Supervisor Sign-off", type: "text", suggest: "history", sticky: true },
      { key: "remarks", label: "Remarks", type: "textarea", full: true },
    ],
  },
  {
    key: "in_process_qc",
    label: "In-Process QC",
    icon: "🔬",
    group: "ccp",
    description: "Checks taken during production — moisture, weight, seasoning ratio — at each process stage. Drying moisture is CCP-1.",
    frequency: "Every batch, each stage",
    dateKey: "date",
    batchKey: "batch_number",
    resultKey: "result",
    failValues: ["Fail"],
    autoFail: true,
    correctiveKey: "corrective_action",
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true, sticky: true },
      { key: "batch_number", label: "Batch No.", type: "text", suggest: "batches", required: true, sticky: true },
      {
        key: "stage",
        label: "Process Stage",
        type: "select",
        required: true,
        options: ["Weighing & mixing", "Drying", "Grinding / blending", "Packaging & sealing"],
      },
      {
        key: "parameter",
        label: "Parameter Checked",
        type: "select",
        required: true,
        options: ["Moisture content", "Net weight", "Seasoning ratio", "Drying temperature", "Other"],
      },
      { key: "target_spec", label: "Target Spec", type: "text", required: true, placeholder: `< ${CCP_MOISTURE_LIMIT}%` },
      { key: "actual_reading", label: "Actual Reading", type: "number", step: "any", required: true, placeholder: "10.2" },
      { key: "result", label: "Pass / Fail", type: "select", required: true, default: "Pass", options: ["Pass", "Fail"] },
      { key: "checked_by", label: "Checked By", type: "text", suggest: "history", required: true, sticky: true },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", full: true, placeholder: "Required if the check fails — e.g. re-dry batch, hold and re-test" },
    ],
    check: (d) => {
      const out: string[] = [];
      const r = num(d, "actual_reading");
      if (str(d, "parameter") === "Moisture content" && r !== null && r > CCP_MOISTURE_LIMIT) {
        out.push(`Moisture ${r}% breaches the CCP-1 critical limit of ${CCP_MOISTURE_LIMIT}% — re-dry, hold and re-test; do not release`);
      }
      return out;
    },
    ccpTag: (d) => (str(d, "stage") === "Drying" && str(d, "parameter") === "Moisture content" ? "CCP-1" : null),
  },
  {
    key: "final_product_qc",
    label: "Final Product QC",
    icon: "✅",
    group: "ccp",
    description: "Release check on finished, packaged goods before dispatch. Foreign body / metal check is CCP-2.",
    frequency: "Every batch",
    dateKey: "date",
    batchKey: "batch_number",
    resultKey: "result",
    failValues: ["Fail"],
    autoFail: true,
    correctiveKey: "corrective_action",
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true, sticky: true },
      { key: "batch_number", label: "Batch No.", type: "text", suggest: "batches", required: true },
      { key: "product", label: "Product", type: "text", suggest: "products", required: true },
      { key: "target_g", label: "Target Net Weight (g)", type: "number", step: "any", default: "100", required: true },
      { key: "tolerance_g", label: "Tolerance ± (g)", type: "number", step: "any", default: "2", required: true },
      { key: "actual_g", label: "Actual Net Weight (g)", type: "number", step: "any", required: true },
      { key: "moisture_pct", label: "Moisture (%)", type: "number", step: "0.1", required: true, placeholder: `≤ ${CCP_MOISTURE_LIMIT}` },
      { key: "water_activity", label: "Water Activity (Aw)", type: "number", step: "0.01", placeholder: `≤ ${WATER_ACTIVITY_MAX}` },
      { key: "sensory", label: "Sensory (Taste/Colour/Aroma)", type: "select", required: true, default: "Normal", options: ["Normal", "Abnormal"] },
      { key: "seal", label: "Packaging & Seal Check", type: "select", required: true, default: "Seal intact", options: ["Seal intact", "Seal defective"] },
      { key: "label_check", label: "Label Check", type: "select", required: true, default: "Batch code + BBE correct", options: ["Batch code + BBE correct", "Label incorrect"] },
      {
        key: "foreign_body",
        label: "Foreign Body / Metal Check (CCP-2)",
        type: "select",
        required: true,
        default: "Clear — none detected",
        options: ["Clear — none detected", "Detected"],
      },
      { key: "foreign_body_method", label: "CCP-2 Method", type: "select", default: "Sieve / visual", options: ["Sieve / visual", "Metal detector"] },
      { key: "result", label: "Pass / Fail", type: "select", required: true, default: "Pass", options: ["Pass", "Fail"] },
      { key: "released_by", label: "Released By", type: "text", suggest: "history", required: true, sticky: true },
      { key: "corrective_action", label: "Corrective Action / Remarks", type: "textarea", full: true, placeholder: "Required if the batch fails — segregate, re-check, investigate equipment wear" },
    ],
    columns: [
      { label: "Date", render: (d) => fmtDate(str(d, "date")) },
      { label: "Batch No.", render: (d) => str(d, "batch_number") || "—" },
      { label: "Product", render: (d) => str(d, "product") || "—" },
      {
        label: "Net Weight Check",
        render: (d) => (str(d, "actual_g") ? `${str(d, "actual_g")}g (target ${str(d, "target_g")}g ± ${str(d, "tolerance_g")}g)` : "—"),
      },
      {
        label: "Moisture / Water Activity",
        render: (d) => `${str(d, "moisture_pct") ? str(d, "moisture_pct") + "%" : "—"} / ${str(d, "water_activity") ? "Aw " + str(d, "water_activity") : "—"}`,
      },
      { label: "Sensory", render: (d) => str(d, "sensory") || "—" },
      { label: "Packaging & Seal", render: (d) => str(d, "seal") || "—" },
      { label: "Label Check", render: (d) => str(d, "label_check") || "—" },
      {
        label: "Foreign Body / Metal (CCP-2)",
        render: (d) => [str(d, "foreign_body"), str(d, "foreign_body_method") && `(${str(d, "foreign_body_method")})`].filter(Boolean).join(" ") || "—",
      },
      { label: "Pass / Fail", render: (d) => str(d, "result") || "—" },
      { label: "Released By", render: (d) => str(d, "released_by") || "—" },
      { label: "Corrective Action / Remarks", render: (d) => str(d, "corrective_action") || "—" },
    ],
    check: (d) => {
      const out: string[] = [];
      const actual = num(d, "actual_g");
      const target = num(d, "target_g");
      const tol = num(d, "tolerance_g") ?? 0;
      if (actual !== null && target !== null && Math.abs(actual - target) > tol) {
        out.push(`Net weight ${actual}g is outside ${target}g ± ${tol}g`);
      }
      const m = num(d, "moisture_pct");
      if (m !== null && m > CCP_MOISTURE_LIMIT) out.push(`Moisture ${m}% is above the ${CCP_MOISTURE_LIMIT}% limit`);
      const aw = num(d, "water_activity");
      if (aw !== null && aw > WATER_ACTIVITY_MAX) out.push(`Water activity ${aw} is above ${WATER_ACTIVITY_MAX}`);
      if (str(d, "sensory") === "Abnormal") out.push("Sensory check abnormal");
      if (str(d, "seal") === "Seal defective") out.push("Seal defective");
      if (str(d, "label_check") === "Label incorrect") out.push("Label incorrect");
      if (str(d, "foreign_body") === "Detected") out.push("CCP-2 breached — foreign body / metal detected");
      return out;
    },
    ccpTag: () => "CCP-2",
  },

  // ---------------------------------------------------------------- Prerequisite programmes
  {
    key: "cleaning_sanitation",
    label: "Cleaning & Sanitation",
    icon: "🧼",
    group: "prp",
    description: "Daily/weekly cleaning and sanitising of equipment, surfaces and premises.",
    frequency: "Daily",
    dateKey: "date",
    staleDays: 3,
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true, sticky: true },
      { key: "area_equipment", label: "Area / Equipment", type: "text", suggest: "history", required: true, placeholder: "Mixing table & bowls" },
      { key: "cleaning_task", label: "Cleaning Task", type: "text", suggest: "history", required: true, placeholder: "Wash + sanitise after use" },
      { key: "sanitiser", label: "Sanitiser Used & Concentration", type: "text", suggest: "history", placeholder: "Sodium hypochlorite 200ppm" },
      { key: "performed_by", label: "Performed By", type: "text", suggest: "history", required: true, sticky: true },
      { key: "time", label: "Time", type: "time", default: "now" },
      { key: "verified_by", label: "Verified By (Supervisor)", type: "text", suggest: "history", sticky: true },
      { key: "corrective_action", label: "Corrective Action (if any)", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "personnel_hygiene",
    label: "Personnel Hygiene",
    icon: "🧤",
    group: "prp",
    description: "Daily hygiene check on production staff before they start handling product.",
    frequency: "Daily, each staff member",
    dateKey: "date",
    staleDays: 3,
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true, sticky: true },
      { key: "employee_name", label: "Employee Name", type: "text", suggest: "history", required: true },
      { key: "health", label: "Health Declaration", type: "select", required: true, default: "Fit", options: ["Fit", "Unfit"] },
      { key: "protective_clothing", label: "Protective Clothing Worn", type: "select", required: true, default: "Yes", options: ["Yes", "No"] },
      { key: "hand_hygiene", label: "Hand Hygiene Check", type: "select", required: true, default: "Washed & sanitised", options: ["Washed & sanitised", "Not done"] },
      { key: "jewellery_nails", label: "Jewellery / Nails Check", type: "select", required: true, default: "None worn / trimmed", options: ["None worn / trimmed", "Not compliant"] },
      { key: "verified_by", label: "Verified By (Supervisor)", type: "text", suggest: "history", sticky: true },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
    check: (d) => {
      const out: string[] = [];
      if (str(d, "health") === "Unfit") out.push("Employee declared unfit — must not handle product");
      if (str(d, "protective_clothing") === "No") out.push("Protective clothing not worn");
      if (str(d, "hand_hygiene") === "Not done") out.push("Hand hygiene not done");
      if (str(d, "jewellery_nails") === "Not compliant") out.push("Jewellery / nails not compliant");
      return out;
    },
  },
  {
    key: "staff_training",
    label: "Staff Training",
    icon: "🎓",
    group: "prp",
    description: "Food safety and hygiene training given to staff — topic, trainer, who attended.",
    frequency: "Per session",
    dateKey: "date",
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true },
      { key: "topic", label: "Training Topic", type: "text", suggest: "history", required: true, placeholder: "Personal hygiene & handwashing" },
      { key: "trainer", label: "Trainer", type: "text", suggest: "history", required: true },
      { key: "attendees", label: "Attendees", type: "textarea", required: true, full: true, placeholder: "J. Mwangi, P. Otieno" },
      { key: "duration", label: "Duration", type: "text", placeholder: "1 hr" },
      { key: "method", label: "Method", type: "select", default: "In-house", options: ["In-house", "External", "On-the-job", "Toolbox talk"] },
      { key: "sign_off", label: "Sign-off", type: "text", default: "All attendees signed register" },
    ],
  },
  {
    key: "pest_control",
    label: "Pest Control",
    icon: "🐀",
    group: "prp",
    description: "Inspection for pest evidence and any treatment applied, internal or contracted.",
    frequency: "Monthly (or per contractor visit)",
    dateKey: "date",
    nilAllowed: true,
    correctiveKey: "treatment_applied",
    due: { key: "next_inspection_due", groupKey: "area_inspected", noun: "inspection" },
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true, sticky: true },
      { key: "area_inspected", label: "Area Inspected", type: "text", suggest: "history", required: true, placeholder: "Raw material store" },
      { key: "evidence", label: "Evidence of Pests (Y/N)", type: "select", required: true, default: "N", options: YN },
      { key: "findings", label: "Findings", type: "text", placeholder: "No droppings/gnaw marks" },
      { key: "treatment_applied", label: "Treatment Applied", type: "text", placeholder: "Bait stations checked" },
      { key: "applied_by", label: "Applied By", type: "text", suggest: "history", placeholder: "Internal / contractor name" },
      { key: "next_inspection_due", label: "Next Inspection Due", type: "date" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
    check: (d) => (str(d, "evidence") === "Y" ? ["Evidence of pests found"] : []),
  },
  {
    key: "supplier_approval",
    label: "Supplier Approval",
    icon: "🤝",
    group: "prp",
    description: "Which suppliers are approved, whether they've provided a Certificate of Analysis, and audit history.",
    frequency: "At approval, then annual review",
    dateKey: "approval_date",
    due: { key: "next_review_due", groupKey: "supplier_name", noun: "review" },
    fields: [
      { key: "supplier_name", label: "Supplier Name", type: "text", suggest: "history", required: true },
      { key: "material_supplied", label: "Material Supplied", type: "text", suggest: "materials", required: true },
      { key: "approval_date", label: "Approval Date", type: "date", default: "today", required: true },
      { key: "coa_received", label: "COA Received (Y/N)", type: "select", required: true, default: "N", options: YN },
      { key: "last_audit", label: "Last Audit / Visit Date", type: "date" },
      { key: "rating", label: "Rating (1-5)", type: "select", options: ["1", "2", "3", "4", "5"] },
      { key: "reviewed_by", label: "Reviewed By", type: "text", suggest: "history", required: true },
      { key: "next_review_due", label: "Next Review Due", type: "date", required: true },
    ],
    check: (d) => {
      const out: string[] = [];
      if (str(d, "coa_received") === "N") out.push("No Certificate of Analysis on file");
      const r = num(d, "rating");
      if (r !== null && r <= 2) out.push(`Low supplier rating (${r}/5)`);
      return out;
    },
  },
  {
    key: "equipment_calibration",
    label: "Equipment Calibration & Maintenance",
    icon: "⚖️",
    group: "prp",
    description: "Scales, sealers and any measuring equipment — calibration and maintenance history.",
    frequency: "Per schedule (e.g. 6-monthly)",
    dateKey: "date",
    due: { key: "next_due", groupKey: "equipment_name", noun: "calibration / maintenance" },
    fields: [
      { key: "equipment_name", label: "Equipment Name", type: "text", suggest: "history", required: true, placeholder: "Digital platform scale" },
      { key: "tag_no", label: "ID / Tag No.", type: "text", suggest: "history", placeholder: "SCL-01" },
      { key: "date", label: "Calibration / Maintenance Date", type: "date", default: "today", required: true },
      { key: "performed_by", label: "Performed By", type: "text", suggest: "history", required: true },
      { key: "result", label: "Result / Findings", type: "text", required: true, placeholder: "Within tolerance (±1g)" },
      { key: "next_due", label: "Next Due Date", type: "date", required: true },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "water_quality",
    label: "Water Quality",
    icon: "💧",
    group: "prp",
    description: "If water touches product or cleaning surfaces — periodic potability testing.",
    frequency: "Per test schedule (e.g. 6-monthly)",
    dateKey: "date",
    resultKey: "pass_fail",
    failValues: ["Fail"],
    due: { key: "next_test_due", groupKey: "water_source", noun: "water test" },
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true },
      { key: "water_source", label: "Water Source", type: "text", suggest: "history", required: true, placeholder: "Borehole (via storage tank)" },
      { key: "parameter_tested", label: "Parameter Tested", type: "text", suggest: "history", required: true, placeholder: "Potability / microbial screen" },
      { key: "result", label: "Result", type: "text", required: true, placeholder: "Within WHO/KEBS limits" },
      { key: "pass_fail", label: "Pass / Fail", type: "select", required: true, default: "Pass", options: ["Pass", "Fail"] },
      { key: "tested_by", label: "Tested By", type: "text", suggest: "history", required: true, placeholder: "External lab" },
      { key: "next_test_due", label: "Next Test Due", type: "date", required: true },
    ],
  },
  {
    key: "storage_conditions",
    label: "Storage Conditions",
    icon: "🌡️",
    group: "prp",
    description: "Temperature, humidity and pest-sighting checks in raw material and finished goods stores.",
    frequency: "Daily",
    dateKey: "date",
    staleDays: 3,
    correctiveKey: "remarks",
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true, sticky: true },
      { key: "time", label: "Time", type: "time", default: "now", required: true },
      { key: "storage_area", label: "Storage Area", type: "text", suggest: "history", required: true, placeholder: "Finished goods store" },
      { key: "temperature", label: "Temperature (°C)", type: "number", step: "0.1", required: true },
      { key: "humidity", label: "Humidity (%)", type: "number", step: "1", required: true },
      { key: "pest_sightings", label: "Pest Sightings (Y/N)", type: "select", required: true, default: "N", options: YN },
      { key: "checked_by", label: "Checked By", type: "text", suggest: "history", required: true, sticky: true },
      { key: "remarks", label: "Remarks", type: "text", placeholder: "Required if a limit is breached" },
    ],
    check: (d) => {
      const out: string[] = [];
      const t = num(d, "temperature");
      const h = num(d, "humidity");
      if (t !== null && t > STORAGE_TEMP_MAX_C) out.push(`Temperature ${t}°C is above ${STORAGE_TEMP_MAX_C}°C`);
      if (h !== null && h > STORAGE_HUMIDITY_MAX) out.push(`Humidity ${h}% is above ${STORAGE_HUMIDITY_MAX}%`);
      if (str(d, "pest_sightings") === "Y") out.push("Pest sighting reported");
      return out;
    },
  },
  {
    key: "traceability",
    label: "Traceability & Batch Coding",
    icon: "🔗",
    group: "prp",
    description: "Links a finished batch back to its raw material lots and forward to where it was distributed — your recall trail.",
    frequency: "Every batch",
    dateKey: "production_date",
    batchKey: "batch_number",
    fields: [
      { key: "batch_number", label: "Batch No.", type: "text", suggest: "batches", required: true },
      { key: "production_date", label: "Production Date", type: "date", default: "today", required: true, fromBatchDate: true },
      { key: "raw_material_lots", label: "Raw Material Lot(s) Used", type: "text", required: true, placeholder: "CHL-0903 / SLT-0810" },
      { key: "qty_produced", label: "Qty Produced", type: "text", required: true },
      { key: "destinations", label: "Distribution Destination(s)", type: "text", suggest: "history", placeholder: "Hotel accounts — Nairobi route" },
      { key: "date_dispatched", label: "Date Dispatched", type: "date" },
      {
        key: "recall_status",
        label: "Recall Status",
        type: "select",
        required: true,
        default: "None — no recall issued",
        options: ["None — no recall issued", "Under investigation", "Recall issued"],
      },
    ],
    check: (d) => (str(d, "recall_status") !== "None — no recall issued" && str(d, "recall_status") !== "" ? [`Recall status: ${str(d, "recall_status")}`] : []),
  },

  // ---------------------------------------------------------------- Issues & corrective action
  {
    key: "customer_complaints",
    label: "Customer Complaint Log",
    icon: "📣",
    group: "issues",
    description: "Every complaint received — or a NIL entry confirming none were received in a period.",
    frequency: "Per complaint / NIL monthly",
    dateKey: "date_received",
    batchKey: "product_batch",
    closeKey: "date_closed",
    nilAllowed: true,
    fields: [
      { key: "date_received", label: "Date Received", type: "date", default: "today", required: true },
      { key: "complainant", label: "Complainant Name & Contact", type: "text", required: true },
      { key: "product_batch", label: "Product & Batch No.", type: "text", suggest: "batches", required: true },
      { key: "nature", label: "Nature of Complaint", type: "textarea", required: true, full: true },
      { key: "severity", label: "Severity", type: "select", required: true, default: "Low", options: ["Low", "Med", "High"] },
      { key: "investigation", label: "Investigation / Root Cause", type: "textarea", full: true },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", full: true },
      { key: "date_closed", label: "Date Closed", type: "date" },
      { key: "closed_by", label: "Closed By", type: "text", suggest: "history" },
    ],
    check: (d) => (str(d, "severity") === "High" ? ["High-severity complaint"] : []),
    validate: (d) => (str(d, "date_closed") && !str(d, "closed_by") ? "Enter who closed this complaint" : null),
  },
  {
    key: "non_conformance",
    label: "Non-Conformance & CAPA",
    icon: "🛠️",
    group: "issues",
    description: "Internal rejects and issues (separate from customer complaints) with corrective and preventive action.",
    frequency: "Per event",
    dateKey: "date",
    batchKey: "batch_number",
    closeKey: "date_closed",
    nilAllowed: true,
    fields: [
      { key: "date", label: "Date", type: "date", default: "today", required: true },
      { key: "batch_number", label: "Batch No.", type: "text", suggest: "batches" },
      { key: "description", label: "Description of Non-Conformance", type: "textarea", required: true, full: true },
      { key: "root_cause", label: "Root Cause", type: "textarea", full: true },
      { key: "corrective_action", label: "Corrective Action", type: "textarea", required: true, full: true },
      { key: "preventive_action", label: "Preventive Action", type: "textarea", full: true },
      { key: "responsible_person", label: "Responsible Person", type: "text", suggest: "history", required: true },
      { key: "date_closed", label: "Date Closed", type: "date" },
      { key: "verified_by", label: "Verified By", type: "text", suggest: "history" },
    ],
    validate: (d) => (str(d, "date_closed") && !str(d, "verified_by") ? "Enter who verified the closure" : null),
  },
];

export const RECORD_TYPE_MAP: Record<string, RecordTypeConfig> = Object.fromEntries(RECORD_TYPES.map((r) => [r.key, r]));

export const GROUPS: { key: GroupKey; title: string; blurb: string }[] = [
  { key: "ccp", title: "CCP & Product QC", blurb: "The checks that control the two Critical Control Points, plus production records" },
  { key: "prp", title: "Prerequisite Programmes", blurb: "Hygiene, pest, supplier, equipment, water, storage and traceability records that support the CCPs" },
  { key: "issues", title: "Complaints & Corrective Action", blurb: "Customer complaints and internal non-conformances — log a NIL entry if none" },
];

// ------------------------------------------------------- shared evaluation

export type Evaluation = {
  data: Data;
  reasons: string[];
  flagged: boolean;
  open: boolean;
};

/** Applies automatic limit checks. Called on every keystroke in the form AND again on save, so what's stored always matches the limits. */
export function evaluate(cfg: RecordTypeConfig, raw: Data): Evaluation {
  const data: Data = { ...raw };
  const reasons = cfg.check ? cfg.check(data) : [];

  if (cfg.autoFail && cfg.resultKey && reasons.length > 0 && cfg.failValues?.length) {
    data[cfg.resultKey] = cfg.failValues[0];
  }

  const resultFailed = !!(cfg.resultKey && cfg.failValues?.includes(str(data, cfg.resultKey)));
  if (resultFailed && reasons.length === 0) {
    reasons.push(`Marked ${str(data, cfg.resultKey!)}`);
  }

  return {
    data,
    reasons,
    flagged: reasons.length > 0,
    open: cfg.closeKey ? !str(data, cfg.closeKey) : false,
  };
}

// ----------------------------------------------------- HACCP plan (static)

export const HACCP_PLAN = {
  product: [
    ["Product name", "SpiseUp Africa spicy salt seasoning"],
    ["Key ingredients", "Dried chili, salt (and other declared seasoning ingredients)"],
    ["Packaging", "Sealed retail/food-service pack, labelled with batch code and best-before date"],
    ["Storage & shelf life", "Ambient, dry storage — shelf life per stability testing"],
    ["Intended use", "Direct food seasoning — hotels, food service, retail consumers"],
    ["Distribution", "100+ hotel accounts across Kenya; growing retail footprint"],
  ] as [string, string][],
  processFlow: [
    "Receiving raw materials (chili, salt) → Raw Material QC check",
    "Storage of raw materials",
    "Weighing & mixing",
    "Drying",
    "Grinding / blending",
    "In-process QC checks",
    "Packaging & sealing",
    "Final Product QC / release",
    "Storage of finished goods",
    "Dispatch to hotel/retail accounts",
  ],
  hazards: [
    ["Receiving raw chili & salt", "Mould/mycotoxins, microbial contamination", "None expected if food-grade", "Foreign matter (stones, stalks, packaging debris)"],
    ["Storage of raw materials", "Microbial growth if damp", "None", "Pest contamination"],
    ["Weighing & mixing", "Cross-contact if shared equipment not cleaned", "Sanitiser residue if rinsed poorly", "Foreign objects from equipment"],
    ["Drying", "Insufficient drying allows mould/bacterial growth", "None", "None"],
    ["Grinding / blending", "None beyond above", "None", "Metal fragments from grinder wear"],
    ["Packaging & sealing", "Contamination if packaging not food-grade", "None", "Foreign matter, packaging fragments"],
    ["Storage of finished goods", "Microbial growth if damp/pest ingress", "None", "Pest contamination"],
  ] as string[][],
  ccps: [
    {
      id: "CCP-1" as CcpId,
      step: "Drying",
      hazard: "Moisture content",
      limit: `≤ ${CCP_MOISTURE_LIMIT}% (verify against your own shelf-life trial)`,
      monitoring: "Moisture meter reading per batch, logged in In-Process QC",
      corrective: "Re-dry batch; hold and re-test; do not release",
      verification: "Weekly review of In-Process QC log by supervisor",
      recordType: "in_process_qc",
    },
    {
      id: "CCP-2" as CcpId,
      step: "Packaging / Final QC",
      hazard: "Foreign body / metal contamination",
      limit: "Zero detectable metal fragments (sieve/visual, or metal detector if installed)",
      monitoring: "Visual/sieve check every batch, logged in Final Product QC",
      corrective: "Segregate and re-check batch; investigate equipment wear",
      verification: "Monthly review of Final Product QC log by supervisor",
      recordType: "final_product_qc",
    },
  ],
  prps: [
    ["Cleaning & Sanitation programme", "cleaning_sanitation"],
    ["Personnel Hygiene programme", "personnel_hygiene"],
    ["Staff Training programme", "staff_training"],
    ["Pest Control programme", "pest_control"],
    ["Supplier Approval programme", "supplier_approval"],
    ["Equipment Calibration & Maintenance", "equipment_calibration"],
    ["Water Quality monitoring", "water_quality"],
    ["Storage condition control", "storage_conditions"],
    ["Traceability & recall procedure", "traceability"],
  ] as [string, string][],
  verification: [
    "Supervisor reviews all logs weekly; sign-off recorded on each log.",
    "Full plan reviewed at least annually, or sooner after any process, supplier, or product change.",
    "Any recurring non-conformance (see Non-Conformance & CAPA log) triggers a review of this plan, not just the affected batch.",
  ],
};
