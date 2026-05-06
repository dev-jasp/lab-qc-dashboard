import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { getGlossaryCategory } from '@/constants/glossary';
import type { GlossaryEntry, GlossarySeverity } from '@/constants/glossary';

interface GlossaryTermListProps {
  entries: GlossaryEntry[];
  allEntries: GlossaryEntry[];
}

function getSeverityLabel(severity: GlossarySeverity): string {
  if (severity === 'valid') {
    return 'Valid';
  }

  if (severity === 'warning') {
    return 'Warning';
  }

  return 'Rejection';
}

function getSeverityClassName(severity: GlossarySeverity): string {
  if (severity === 'valid') {
    return 'bg-[#dcfce7] text-[#16a34a]';
  }

  if (severity === 'warning') {
    return 'bg-[#fef3c7] text-[#d97706]';
  }

  return 'bg-[#fee2e2] text-[#dc2626]';
}

export function GlossaryTermList({ entries, allEntries }: GlossaryTermListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center">
        <p className="text-sm font-semibold text-[#111827]">No glossary terms found</p>
        <p className="mt-2 text-sm text-[#6b7280]">Try a related term such as OD, Westgard, CV, or lot.</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="rounded-xl border border-[#eef2f7] bg-white">
      {entries.map((entry) => {
        const category = getGlossaryCategory(entry.categoryId);
        const relatedTerms = allEntries.filter((relatedEntry) => entry.relatedTermIds.includes(relatedEntry.id));

        return (
          <AccordionItem key={entry.id} value={entry.id} className="border-[#eef2f7] px-4">
            <AccordionTrigger className="gap-4 py-4 hover:no-underline">
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-[#111827]">{entry.term}</span>
                  {entry.severity !== undefined && (
                    <Badge className={getSeverityClassName(entry.severity)}>{getSeverityLabel(entry.severity)}</Badge>
                  )}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b7280]">{category.label}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <p className="max-w-4xl text-sm leading-7 text-[#374151]">{entry.definition}</p>
              {relatedTerms.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">Related</span>
                  {relatedTerms.map((relatedEntry) => (
                    <Badge key={relatedEntry.id} variant="outline" className="border-[#dbe3ef] text-[#374151]">
                      {relatedEntry.term}
                    </Badge>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
