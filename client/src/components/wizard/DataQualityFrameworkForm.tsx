import { QualityDimensions, PurposeOfUse } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataQualityFrameworkFormProps {
  framework: string;
  dimensions: QualityDimensions;
  purpose: PurposeOfUse;
  onUpdateFramework: (framework: string) => void;
  onUpdateDimensions: (dimensions: QualityDimensions) => void;
  onUpdatePurpose: (purpose: PurposeOfUse) => void;
}

export default function DataQualityFrameworkForm({
  framework,
  dimensions,
  purpose,
  onUpdateFramework,
  onUpdateDimensions,
  onUpdatePurpose
}: DataQualityFrameworkFormProps) {
  const handleDimensionChange = (dimension: keyof QualityDimensions, checked: boolean) => {
    onUpdateDimensions({
      ...dimensions,
      [dimension]: checked
    });
  };

  const handlePurposeChange = (purposeKey: keyof PurposeOfUse, checked: boolean) => {
    onUpdatePurpose({
      ...purpose,
      [purposeKey]: checked
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">Data Quality Framework</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="framework">Select Framework</Label>
          <Select value={framework} onValueChange={onUpdateFramework}>
            <SelectTrigger id="framework">
              <SelectValue placeholder="Select framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kahn">Kahn Framework</SelectItem>
              <SelectItem value="ohdsi">OHDSI Data Quality Dashboard</SelectItem>
              <SelectItem value="custom">Custom Framework</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Quality Dimensions</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id="dim-completeness"
                  checked={dimensions.completeness}
                  onCheckedChange={(checked) => handleDimensionChange("completeness", !!checked)}
                />
                <Label
                  htmlFor="dim-completeness"
                  className="ml-2 text-sm text-gray-700"
                >
                  Completeness
                </Label>
              </div>
              <span className="text-xs text-gray-500">
                Presence of expected data
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id="dim-conformity"
                  checked={dimensions.conformity}
                  onCheckedChange={(checked) => handleDimensionChange("conformity", !!checked)}
                />
                <Label
                  htmlFor="dim-conformity"
                  className="ml-2 text-sm text-gray-700"
                >
                  Conformity
                </Label>
              </div>
              <span className="text-xs text-gray-500">
                Data meets format specifications
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id="dim-plausibility"
                  checked={dimensions.plausibility}
                  onCheckedChange={(checked) => handleDimensionChange("plausibility", !!checked)}
                />
                <Label
                  htmlFor="dim-plausibility"
                  className="ml-2 text-sm text-gray-700"
                >
                  Plausibility
                </Label>
              </div>
              <span className="text-xs text-gray-500">
                Data values are believable
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id="dim-timeliness"
                  checked={dimensions.timeliness}
                  onCheckedChange={(checked) => handleDimensionChange("timeliness", !!checked)}
                />
                <Label
                  htmlFor="dim-timeliness"
                  className="ml-2 text-sm text-gray-700"
                >
                  Timeliness
                </Label>
              </div>
              <span className="text-xs text-gray-500">
                Data is current and available when needed
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id="dim-calculability"
                  checked={dimensions.calculability}
                  onCheckedChange={(checked) => handleDimensionChange("calculability", !!checked)}
                />
                <Label
                  htmlFor="dim-calculability"
                  className="ml-2 text-sm text-gray-700"
                >
                  Calculability
                </Label>
              </div>
              <span className="text-xs text-gray-500">
                Data can be used in calculations
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Purpose of Use</Label>
          <div className="space-y-2">
            <div className="flex items-center">
              <Checkbox
                id="purpose-product"
                checked={purpose.product}
                onCheckedChange={(checked) => handlePurposeChange("product", !!checked)}
              />
              <Label
                htmlFor="purpose-product"
                className="ml-2 text-sm text-gray-700"
              >
                Product Use
              </Label>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="purpose-consumer"
                checked={purpose.consumer}
                onCheckedChange={(checked) => handlePurposeChange("consumer", !!checked)}
              />
              <Label
                htmlFor="purpose-consumer"
                className="ml-2 text-sm text-gray-700"
              >
                Consumer-facing
              </Label>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="purpose-provider"
                checked={purpose.provider}
                onCheckedChange={(checked) => handlePurposeChange("provider", !!checked)}
              />
              <Label
                htmlFor="purpose-provider"
                className="ml-2 text-sm text-gray-700"
              >
                Provider-facing
              </Label>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="purpose-analytics"
                checked={purpose.analytics}
                onCheckedChange={(checked) => handlePurposeChange("analytics", !!checked)}
              />
              <Label
                htmlFor="purpose-analytics"
                className="ml-2 text-sm text-gray-700"
              >
                Analytics
              </Label>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="purpose-quality"
                checked={purpose.quality}
                onCheckedChange={(checked) => handlePurposeChange("quality", !!checked)}
              />
              <Label
                htmlFor="purpose-quality"
                className="ml-2 text-sm text-gray-700"
              >
                Quality Reporting
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
