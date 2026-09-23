// 

import React from 'react'

export default async function test() {
  const response = await fetch(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: "openrouter/free",

      messages: [
        {
          role: "user",
          content: "Say hello and return your model name.",
        },
      ],
    }),
  }
);

const data = await response.json();

console.log(data);
  return (
    <div>
      test
    </div>
  )
}
