import React from 'react'
import HeroSection from './HeroSection';
import FeatureSections from './FeatureSections';
import DiscoverSection from './Discover';
import CallToActionSection from './CallToActionSection';
import FooterSection from './FooterSection';

const Landing = () => {
  return (
    <div>
      <HeroSection />
      <FeatureSections />
      <DiscoverSection />
      <CallToActionSection />
      <FooterSection />
    </div>
  )
}

export default Landing;