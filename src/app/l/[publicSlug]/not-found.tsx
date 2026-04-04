/* eslint-disable @next/next/no-img-element */

export default function PublicLandingNotFound() {
  return (
    <main className="construction-page">
      <div className="construction-card">
        <img
          alt="공사중 안내 일러스트"
          className="construction-image"
          src="/under-construction-cute.svg"
        />
        <div className="construction-copy">
          <span className="eyebrow">잠시만요</span>
          <h1>공사중</h1>
          <p>이 랜딩페이지는 현재 사용이 중지되었거나 준비 중입니다.</p>
        </div>
      </div>
    </main>
  );
}
