import { QuestionIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { GlossarySearch } from '@/components/help/GlossarySearch';
import { GlossaryTermList } from '@/components/help/GlossaryTermList';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES, getGlossaryCategory } from '@/constants/glossary';
import type { GlossaryCategoryId } from '@/constants/glossary';

type GlossaryTabValue = 'all' | GlossaryCategoryId;

function isGlossaryTabValue(value: string): value is GlossaryTabValue {
  return value === 'all' || GLOSSARY_CATEGORIES.some((category) => category.id === value);
}

function entryMatchesSearch(entryId: string, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  const entry = GLOSSARY_ENTRIES.find((item) => item.id === entryId);

  if (entry === undefined) {
    return false;
  }

  const category = getGlossaryCategory(entry.categoryId);
  const haystack = [entry.term, ...entry.aliases, category.label, entry.definition].join(' ').toLowerCase();

  return haystack.includes(query);
}

export function Help() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryTabValue>('all');
  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo(
    () =>
      GLOSSARY_ENTRIES.filter((entry) => {
        const categoryMatches = selectedCategory === 'all' || entry.categoryId === selectedCategory;

        return categoryMatches && entryMatchesSearch(entry.id, normalizedQuery);
      }),
    [normalizedQuery, selectedCategory],
  );

  const searchMatchedEntries = useMemo(
    () => GLOSSARY_ENTRIES.filter((entry) => entryMatchesSearch(entry.id, normalizedQuery)),
    [normalizedQuery],
  );

  const handleTabChange = (value: string) => {
    if (isGlossaryTabValue(value)) {
      setSelectedCategory(value);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1aff]">
              <QuestionIcon size={15} />
              Help & Glossary
            </div>
            <h1 className="text-3xl font-bold text-[#111827]">QC terminology reference</h1>
            <p className="mt-3 text-sm leading-7 text-[#6b7280]">
              Quick definitions for the chart, Westgard rules, control types, flags, CV monitoring, and lot management terms used across QC Pulse.
            </p>
          </div>

          <div className="w-full lg:max-w-sm lg:pt-9">
            <GlossarySearch value={query} onChange={setQuery} />
          </div>
        </div>
      </section>

      <Tabs value={selectedCategory} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="h-9 flex-none rounded-full border-[#dbe3ef] bg-white px-4 text-[#374151] data-active:border-[#1a1aff] data-active:bg-[#eef2ff] data-active:text-[#1a1aff]"
          >
            All
            <Badge variant="outline" className="ml-1 border-transparent bg-[#f3f4f6] text-[#6b7280]">
              {searchMatchedEntries.length}
            </Badge>
          </TabsTrigger>
          {GLOSSARY_CATEGORIES.map((category) => {
            const categoryCount = searchMatchedEntries.filter((entry) => entry.categoryId === category.id).length;

            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="h-9 flex-none rounded-full border-[#dbe3ef] bg-white px-4 text-[#374151] data-active:border-[#1a1aff] data-active:bg-[#eef2ff] data-active:text-[#1a1aff]"
              >
                {category.label}
                <Badge variant="outline" className="ml-1 border-transparent bg-[#f3f4f6] text-[#6b7280]">
                  {categoryCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory}>
          <GlossaryTermList entries={filteredEntries} allEntries={GLOSSARY_ENTRIES} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
