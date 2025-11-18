import { defineLiveCollection } from 'astro:content';
import { variableLoader, distributionLoader, categoricalLoader } from '@/loaders.ts';

const variables = defineLiveCollection({
  loader: variableLoader(),
});

const distributions = defineLiveCollection({
  loader: distributionLoader(),
});

const categorical = defineLiveCollection({
  loader: categoricalLoader(),
});

export const collections = { variables, distributions, categorical };