import { useState } from "react";
import { createTestSuite } from "wasp/client/operations";
import { Button } from "../../shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../shared/components/ui/dialog";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { Textarea } from "../../shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../shared/components/ui/select";
import {
  Loader2,
  Sparkles,
  Globe,
  Cpu,
  Settings2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface CreateTestSuiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormData = {
  goal: string;
  startUrl: string;
  model: string;
  headless: boolean;
  timeout: number;
};

const DEFAULT_FORM: FormData = {
  goal: "",
  startUrl: "",
  model: "gemini-flash",
  headless: true,
  timeout: 30000,
};

const EXAMPLE_GOALS = [
  {
    label: "Login flow",
    text: "Login with email test@example.com and password test1234, then verify the dashboard loads.",
  },
  {
    label: "E-commerce search",
    text: "Search for 'wireless headphones', pick the first result, and add it to the cart.",
  },
  {
    label: "Signup form",
    text: "Fill out the signup form with a fresh email and password, accept terms, and submit.",
  },
];

const MODEL_OPTIONS = [
  {
    value: "gemini-flash",
    label: "Gemini Flash",
    blurb: "Fast & cheap — recommended for most runs",
    badge: "Default",
  },
  {
    value: "gemini-pro",
    label: "Gemini Pro",
    blurb: "Balanced reasoning for tricky flows",
    badge: "Balanced",
  },
  {
    value: "gpt-4o",
    label: "GPT-4o",
    blurb: "Premium reasoning, highest cost",
    badge: "Premium",
  },
];

export function CreateTestSuiteDialog({
  open,
  onOpenChange,
}: CreateTestSuiteDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);

  const reset = () => {
    setFormData(DEFAULT_FORM);
    setError(null);
    setStep(1);
  };

  const close = () => {
    if (isSubmitting) return;
    reset();
    onOpenChange(false);
  };

  // Step 1 is valid when goal + URL are present and URL parses
  const step1Valid =
    formData.goal.trim().length > 0 &&
    formData.startUrl.trim().length > 0 &&
    (() => {
      try {
        new URL(formData.startUrl.trim());
        return true;
      } catch {
        return false;
      }
    })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Valid) {
      setStep(1);
      setError("Please fill in a goal and a valid start URL.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createTestSuite({
        goal: formData.goal,
        startUrl: formData.startUrl,
        model: formData.model,
        headless: formData.headless,
        timeout: formData.timeout,
      });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to create test suite:", err);
      setError(err.message || "Failed to create test suite. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedModel = MODEL_OPTIONS.find((m) => m.value === formData.model);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
        {/* Gradient header bar */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600" />

        <div className="px-6 pt-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Create Test Suite</DialogTitle>
                <DialogDescription className="text-sm">
                  Describe your goal in natural language — the AI agent will figure out the rest.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step indicator */}
          <div className="mt-6 flex items-center gap-2 text-xs">
            {[
              { n: 1, label: "What to test" },
              { n: 2, label: "AI model" },
              { n: 3, label: "Review" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full font-semibold transition-colors",
                    step === s.n
                      ? "bg-blue-600 text-white shadow-sm"
                      : step > s.n
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-500"
                  )}
                >
                  {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                </div>
                <span
                  className={cn(
                    "font-medium",
                    step === s.n ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-px bg-gray-200 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {/* STEP 1: Goal + URL */}
          {step === 1 && (
            <div className="grid gap-5 py-6">
              <div className="grid gap-2">
                <Label htmlFor="goal" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Test Goal <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="goal"
                  placeholder="E.g. Login with test credentials, navigate to the dashboard, and verify the user profile."
                  value={formData.goal}
                  onChange={(e) =>
                    setFormData({ ...formData, goal: e.target.value })
                  }
                  rows={4}
                  className="resize-none"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">
                    Try:
                  </span>
                  {EXAMPLE_GOALS.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, goal: ex.text })
                      }
                      className="text-xs rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="startUrl" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Start URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.startUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, startUrl: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The agent opens this URL before taking its first action.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Model + browser mode */}
          {step === 2 && (
            <div className="grid gap-5 py-6">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  AI Model
                </Label>
                <div className="grid gap-2">
                  {MODEL_OPTIONS.map((m) => {
                    const active = formData.model === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, model: m.value })}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                          active
                            ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{m.label}</span>
                            <span
                              className={cn(
                                "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded",
                                active
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-200 text-gray-700"
                              )}
                            >
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.blurb}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full border-2 flex-none",
                            active
                              ? "border-blue-600 bg-blue-600 ring-4 ring-blue-100"
                              : "border-gray-300"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="timeout" className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-blue-600" />
                    Step Timeout (ms)
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formData.timeout}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeout: parseInt(e.target.value || "0", 10),
                      })
                    }
                    min={5000}
                    max={60000}
                    step={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max wait between actions
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="headless">Browser Mode</Label>
                  <Select
                    value={formData.headless.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, headless: value === "true" })
                    }
                  >
                    <SelectTrigger id="headless">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Headless (faster)</SelectItem>
                      <SelectItem value="false">Visible (debug)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Headless runs without a visible window
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="grid gap-3 py-6">
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white border">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                      Goal
                    </p>
                    <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">
                      {formData.goal}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-gray-50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Start URL
                  </p>
                  <p className="text-sm text-gray-900 mt-1 font-mono truncate">
                    {formData.startUrl}
                  </p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Model
                  </p>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedModel?.label} —{" "}
                    <span className="text-muted-foreground">
                      {selectedModel?.badge}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Browser
                  </p>
                  <p className="text-sm text-gray-900 mt-1">
                    {formData.headless ? "Headless" : "Visible"}
                  </p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Timeout
                  </p>
                  <p className="text-sm text-gray-900 mt-1">
                    {formData.timeout.toLocaleString()} ms
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-none" />
                <span>
                  This creates the suite in <strong>IDLE</strong> status. You can
                  run it from the details page.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-none" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((step - 1) as 1 | 2)}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {step < 3 && (
              <Button
                type="button"
                onClick={() => {
                  if (step === 1 && !step1Valid) {
                    setError("Please fill in a goal and a valid start URL.");
                    return;
                  }
                  setError(null);
                  setStep((step + 1) as 2 | 3);
                }}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Create Test Suite
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
