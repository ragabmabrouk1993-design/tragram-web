import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";

type Home2WhyChooseUsProps = {
  copy?: Home2Copy;
};

export default function Home2WhyChooseUs({ copy }: Home2WhyChooseUsProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  return (
    <div className="why-choose-us-elite">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-xl-6">
            <div className="why-choose-image-box-elite wow fadeInUp" data-wow-delay="0.2s">
              <div className="why-choose-image-elite">
                <figure>
                  <Home2Image src="/images/why-choose-us-image-elite.png" alt="" />
                </figure>
              </div>
            </div>
          </div>
          <div className="col-xl-6">
            <div className="why-choose-content-elite">
              <div className="section-title">
                <h3 className="wow fadeInUp">{resolvedCopy.whyChoose.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {resolvedCopy.whyChoose.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay="0.2s">
                  {resolvedCopy.whyChoose.body}
                </p>
              </div>

              <div className="why-choose-item-list-elite">
                <div className="why-choose-item-elite wow fadeInUp">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-why-choose-item-1-elite.svg" alt="" />
                  </div>
                  <div className="why-choose-item-content-elite">
                    <h3>{resolvedCopy.whyChoose.item1Title}</h3>
                    <p>{resolvedCopy.whyChoose.item1Body}</p>
                  </div>
                </div>
                <div className="why-choose-item-elite wow fadeInUp" data-wow-delay="0.2s">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-why-choose-item-2-elite.svg" alt="" />
                  </div>
                  <div className="why-choose-item-content-elite">
                    <h3>{resolvedCopy.whyChoose.item2Title}</h3>
                    <p>{resolvedCopy.whyChoose.item2Body}</p>
                  </div>
                </div>
                <div className="why-choose-item-elite wow fadeInUp" data-wow-delay="0.4s">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-why-choose-item-3-elite.svg" alt="" />
                  </div>
                  <div className="why-choose-item-content-elite">
                    <h3>{resolvedCopy.whyChoose.item3Title}</h3>
                    <p>{resolvedCopy.whyChoose.item3Body}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
