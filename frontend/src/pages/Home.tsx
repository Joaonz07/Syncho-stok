import HeaderSection from '../components/home/HeaderSection';
import HeroSection from '../components/home/HeroSection';
import FeaturesSection from '../components/home/FeaturesSection';
import BenefitsSection from '../components/home/BenefitsSection';
import PlansSection from '../components/home/PlansSection';
import SocialProofSection from '../components/home/SocialProofSection';
import FinalCtaSection from '../components/home/FinalCtaSection';
import FooterSection from '../components/home/FooterSection';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <HeaderSection />
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <PlansSection />
      <SocialProofSection />
      <FinalCtaSection />
      <FooterSection />
    </div>
  );
};

export default Home;
