import { useNewsData } from "../../hooks/useNewsData";

export default function NewsTab({ active }) {
  const { newsItems, newsLoading, newsError } = useNewsData(active);

  return (
    <div className="dashboard-row full">
      <div className="card">
        <div className="card-header news-header-balanced activity-header-compact">
          <h2 className="market-title">Știri</h2>
        </div>
        <div className="card-body">
          {newsLoading && <p className="small-text">Se încarcă știrile…</p>}
          {newsError && <p className="badge rejected">{newsError}</p>}
          {!newsLoading && !newsError && newsItems.length === 0 && (
            <p className="small-text">Nu au fost găsite știri relevante.</p>
          )}
          {!newsLoading && !newsError && newsItems.length > 0 && (
            <div className="news-list">
              {newsItems.map((item) => (
                <a
                  key={item.url}
                  className="news-item"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.image && (
                    <img
                      className="news-thumb"
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                    />
                  )}
                  <div className="news-content">
                    <div className="news-title">{item.title}</div>
                    <div className="small-text">
                      {item.source?.name ? item.source.name + " • " : ""}
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString("ro-RO")
                        : ""}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
