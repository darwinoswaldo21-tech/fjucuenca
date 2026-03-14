import React from "react";

const resources = [
  {
    id: 1,
    title: "Biblia Online",
    url: "https://www.bible.com",
  },
  {
    id: 2,
    title: "Videos FJU",
    url: "https://www.youtube.com",
  },
  {
    id: 3,
    title: "Devocionales",
    url: "https://www.biblegateway.com",
  },
];

export default function ResourcesScreen() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Resources</h2>

      <div>
        {resources.map((res) => (
          <a
            key={res.id}
            href={res.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              marginBottom: "10px",
              color: "#0f9d58",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            {res.title}
          </a>
        ))}
      </div>
    </div>
  );
}