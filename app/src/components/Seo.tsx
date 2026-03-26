import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  image?: string;
  robots?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_URL = 'https://corpdeals.io';
const DEFAULT_IMAGE = '/hero_main.jpg';

const upsertMetaTag = (
  attribute: 'name' | 'property',
  value: string,
  content: string
) => {
  let tag = document.head.querySelector(
    `meta[${attribute}="${value}"]`
  ) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, value);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
};

const upsertCanonicalTag = (href: string) => {
  let link = document.head.querySelector(
    'link[rel="canonical"]'
  ) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }

  link.setAttribute('href', href);
};

const upsertStructuredData = (data?: SeoProps['structuredData']) => {
  const existing = document.head.querySelector(
    'script[data-seo-structured-data="true"]'
  );
  if (existing) {
    existing.remove();
  }

  if (!data) {
    return;
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo-structured-data', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

const Seo = ({
  title,
  description,
  path = '/',
  keywords,
  image = DEFAULT_IMAGE,
  robots = 'index, follow',
  structuredData,
}: SeoProps) => {
  useEffect(() => {
    const canonicalUrl = new URL(path, SITE_URL).toString();
    const imageUrl = new URL(image, SITE_URL).toString();

    document.title = title;

    upsertMetaTag('name', 'title', title);
    upsertMetaTag('name', 'description', description);
    upsertMetaTag('name', 'robots', robots);
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:image', imageUrl);

    if (keywords) {
      upsertMetaTag('name', 'keywords', keywords);
    }

    upsertMetaTag('property', 'og:type', 'website');
    upsertMetaTag('property', 'og:site_name', 'CorpDeals');
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:image', imageUrl);

    upsertCanonicalTag(canonicalUrl);
    upsertStructuredData(structuredData);
  }, [description, image, keywords, path, robots, structuredData, title]);

  return null;
};

export default Seo;
