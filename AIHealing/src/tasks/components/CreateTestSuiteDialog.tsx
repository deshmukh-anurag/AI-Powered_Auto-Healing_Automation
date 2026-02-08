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
import { Loader2 } from "lucide-react";

interface CreateTestSuiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTestSuiteDialog({ open, onOpenChange }: CreateTestSuiteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    goal: "",
    startUrl: "",
    model: "gemini-flash",
    headless: true,
    timeout: 30000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call Wasp action to create test suite
      await createTestSuite({
        goal: formData.goal,
        startUrl: formData.startUrl,
        model: formData.model,
        headless: formData.headless,
        timeout: formData.timeout,
      });
      
      // Reset form and close dialog
      setFormData({
        goal: "",
        startUrl: "",
        model: "gemini-flash",
        headless: true,
        timeout: 30000,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to create test suite:", err);
      setError(err.message || "Failed to create test suite. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Test Suite</DialogTitle>
          <DialogDescription>
            Define your automation goal and configuration. The AI will handle the rest!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Goal Input */}
            <div className="grid gap-2">
              <Label htmlFor="goal">
                Test Goal <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="goal"
                placeholder="Example: Login to the app with test credentials, navigate to dashboard, and verify user profile"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                required
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Describe what you want the automation to do in natural language
              </p>
            </div>

            {/* Start URL Input */}
            <div className="grid gap-2">
              <Label htmlFor="startUrl">
                Start URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startUrl"
                type="url"
                placeholder="https://example.com"
                value={formData.startUrl}
                onChange={(e) => setFormData({ ...formData, startUrl: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                The URL where the automation should begin
              </p>
            </div>

            {/* AI Model Selection */}
            <div className="grid gap-2">
              <Label htmlFor="model">AI Model</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData({ ...formData, model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-flash">
                    Gemini Flash (Fast & Cheap)
                  </SelectItem>
                  <SelectItem value="gemini-pro">
                    Gemini Pro (Balanced)
                  </SelectItem>
                  <SelectItem value="gpt-4o">
                    GPT-4o (Premium)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the AI model for decision-making
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={formData.timeout}
                  onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                  min={5000}
                  max={60000}
                  step={1000}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="headless">Browser Mode</Label>
                <Select
                  value={formData.headless.toString()}
                  onValueChange={(value) => setFormData({ ...formData, headless: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Headless (Faster)</SelectItem>
                    <SelectItem value="false">Visible (Debug)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Test Suite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
