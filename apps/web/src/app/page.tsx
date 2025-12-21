import Link from "next/link";
import { AnnouncementBadge } from "@/components/elements/announcement-badge";
import { ButtonLink, PlainButtonLink } from "@/components/elements/button";
import { Container } from "@/components/elements/container";
import { Main } from "@/components/elements/main";
import { Screenshot } from "@/components/elements/screenshot";
import { ArrowNarrowRightIcon } from "@/components/icons/arrow-narrow-right-icon";
import { GitHubIcon } from "@/components/icons/social/github-icon";
import { XIcon } from "@/components/icons/social/x-icon";
import {
  FAQsTwoColumnAccordion,
  Faq,
} from "@/components/sections/faqs-two-column-accordion";
import {
  FooterCategory,
  FooterLink,
  FooterWithNewsletterFormCategoriesAndSocialIcons,
  SocialLink,
} from "@/components/sections/footer-with-newsletter-form-categories-and-social-icons";
import { HeroLeftAlignedWithDemo } from "@/components/sections/hero-left-aligned-with-demo";
import { NavbarLogo } from "@/components/sections/navbar-with-links-actions-and-centered-logo";

export default function Page() {
  return (
    <>
      <Container className="pt-12">
        <NavbarLogo href="/">
          <p className="font-serif text-2xl dark:text-white">OpenSheets</p>
        </NavbarLogo>
      </Container>
      <Main>
        {/* Hero */}
        <HeroLeftAlignedWithDemo
          id="hero"
          eyebrow={
            <AnnouncementBadge
              target="_blank"
              href="https://github.com/martinsione/opensheets"
              text="OpenSheets is open source"
              cta="Star on GitHub"
            />
          }
          headline="The open source AI agent for spreadsheets."
          subheadline={
            <p>It lets you use AI to automate your spreadsheet tasks.</p>
          }
          cta={
            <div className="flex items-center gap-4">
              <ButtonLink href="/workbook" size="lg">
                Try it now
              </ButtonLink>

              <PlainButtonLink
                target="_blank"
                href="https://x.com/sionemart/status/2000809819390029977"
                size="lg"
              >
                See how it works <ArrowNarrowRightIcon />
              </PlainButtonLink>
            </div>
          }
          demo={
            <Screenshot
              className="rounded-lg"
              wallpaper="green"
              placement="bottom"
            >
              {/** biome-ignore lint/performance/noImgElement: <> */}
              <img
                src="/screenshot.png"
                alt="OpenSheets for Google Sheets"
                className="bg-white/75"
                width={3440}
                height={1990}
              />
            </Screenshot>
          }
          footer={undefined}
        />

        {/* FAQs */}
        <FAQsTwoColumnAccordion id="faqs" headline="Questions & Answers">
          <Faq
            id="faq-1"
            question="What is the price of OpenSheets?"
            answer="OpenSheets is free, bring your own key and pay directly to the AI provider."
          />
          <Faq
            id="faq-2"
            question="Does OpenSheets store my data?"
            answer="No, OpenSheets does not store your data. It runs entirely in your browser and your data is never sent to our servers."
          />
        </FAQsTwoColumnAccordion>
      </Main>

      <FooterWithNewsletterFormCategoriesAndSocialIcons
        id="footer"
        cta={<Link href="/">OpenSheets</Link>}
        links={
          <>
            <FooterCategory title="Resources">
              <FooterLink href="/support">Support</FooterLink>
            </FooterCategory>
            <FooterCategory title="Legal">
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
            </FooterCategory>
          </>
        }
        fineprint="© 2025 Oatmeal, Inc."
        socialLinks={
          <>
            <SocialLink target="_blank" href="https://x.com/sionemart" name="X">
              <XIcon />
            </SocialLink>
            <SocialLink
              target="_blank"
              href="https://github.com/martinsione/opensheets"
              name="GitHub"
            >
              <GitHubIcon />
            </SocialLink>
          </>
        }
      />
    </>
  );
}
