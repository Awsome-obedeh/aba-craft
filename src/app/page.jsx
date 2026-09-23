import { HomeHeader, Hero, Benefits, Collections, FeaturedProducts, HowItWorks, ArtisanStory, ShopBanner, HomeFooter } from '@/components/home/HomeSections';
import styles from '@/components/home/home.module.css';

export default function Home() {
  return (
    <div className={styles.home}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <HomeHeader />
      <main id="main-content">
        <Hero /><Benefits /><Collections /><FeaturedProducts />
        <HowItWorks /><ArtisanStory /><ShopBanner />
      </main>
      <HomeFooter />
    </div>
  );
}
