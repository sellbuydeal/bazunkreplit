import type { ProductVariant, ProductVariantOption } from "@/data/products";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selected: Record<string, string>;
  onChange: (type: string, value: string) => void;
  priceDelta?: number;
  formatPrice?: (n: number) => string;
}

function ColourSwatch({ option, active, disabled, onClick }: {
  option: ProductVariantOption; active: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={option.label}
      className={`relative w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A5CE8] ${
        active
          ? "border-[#4A5CE8] scale-110 shadow-md"
          : disabled
          ? "border-gray-200 opacity-40 cursor-not-allowed"
          : "border-transparent hover:border-gray-300 hover:scale-105"
      }`}
      style={{ backgroundColor: option.hex ?? "#ccc" }}
    >
      {disabled && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-full h-px bg-gray-400 rotate-45 block" />
        </span>
      )}
    </button>
  );
}

function SizePill({ option, active, disabled, onClick }: {
  option: ProductVariantOption; active: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A5CE8] ${
        active
          ? "border-[#4A5CE8] bg-[#4A5CE8] text-white shadow-sm"
          : disabled
          ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through"
          : "border-gray-200 text-gray-700 hover:border-[#4A5CE8] hover:text-[#4A5CE8]"
      }`}
    >
      {option.label}
      {!disabled && option.stock <= 2 && option.stock > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" title={`Only ${option.stock} left`} />
      )}
    </button>
  );
}

export function VariantSelector({ variants, selected, onChange, priceDelta = 0, formatPrice }: VariantSelectorProps) {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="space-y-4">
      {variants.map((variant) => {
        const selectedValue = selected[variant.type];
        const selectedOption = variant.options.find((o) => o.value === selectedValue);

        return (
          <div key={variant.type}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">
                {variant.label}
                {selectedOption && (
                  <span className="font-normal text-gray-500 ml-1">— {selectedOption.label}</span>
                )}
              </span>
              {selectedOption && selectedOption.stock > 0 && selectedOption.stock <= 3 && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Only {selectedOption.stock} left
                </span>
              )}
              {selectedOption && selectedOption.stock === 0 && (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  Out of stock
                </span>
              )}
            </div>

            {variant.type === "colour" ? (
              <div className="flex flex-wrap gap-2">
                {variant.options.map((option) => (
                  <ColourSwatch
                    key={option.value}
                    option={option}
                    active={selectedValue === option.value}
                    disabled={option.stock === 0}
                    onClick={() => onChange(variant.type, option.value)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {variant.options.map((option) => (
                  <SizePill
                    key={option.value}
                    option={option}
                    active={selectedValue === option.value}
                    disabled={option.stock === 0}
                    onClick={() => onChange(variant.type, option.value)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {priceDelta !== 0 && formatPrice && (
        <p className="text-xs text-gray-500">
          {priceDelta > 0 ? "+" : ""}
          {formatPrice(Math.abs(priceDelta))} for selected option
        </p>
      )}
    </div>
  );
}
