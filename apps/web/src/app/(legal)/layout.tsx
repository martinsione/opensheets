import Link from "next/link";
import { Container } from "@/components/elements/container";
import { Document } from "@/components/elements/document";
import { Main } from "@/components/elements/main";
import { GitHubIcon } from "@/components/icons/social/github-icon";
import { XIcon } from "@/components/icons/social/x-icon";
import {
  FooterCategory,
  FooterLink,
  FooterWithNewsletterFormCategoriesAndSocialIcons,
  SocialLink,
} from "@/components/sections/footer-with-newsletter-form-categories-and-social-icons";
import { NavbarLogo } from "@/components/sections/navbar-with-links-actions-and-centered-logo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Container className="pt-12 text-center">
        <NavbarLogo href="/">
          <p className="font-serif text-2xl dark:text-white">OpenSheets</p>
        </NavbarLogo>
      </Container>

      <Main>
        <section className="py-16">
          <Container>
            <Document className="mx-auto max-w-2xl">{children}</Document>
          </Container>
        </section>
      </Main>

      <FooterWithNewsletterFormCategoriesAndSocialIcons
        id="footer"
        cta={<Link href="/">OpenSheets</Link>}
        links={
          <>
            <FooterCategory title="Resources">
              <FooterLink href="https://github.com/martinsione/opensheets">
                GitHub
              </FooterLink>
              <FooterLink href="/support">Support</FooterLink>
            </FooterCategory>
            <FooterCategory title="Legal">
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
            </FooterCategory>
          </>
        }
        fineprint="© 2025 OpenSheets"
        socialLinks={
          <>
            <SocialLink href="https://x.com/sionemart" name="X">
              <XIcon />
            </SocialLink>
            <SocialLink
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
