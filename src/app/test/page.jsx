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

          content: [
            {
              type: "text",
              text: `
You are analyzing a Nigerian CAC registration document.

Extract:
- Registered business name
- CAC/RC/BN registration number
- Registration date
- Business type

Return ONLY JSON.

Example:

{
  "businessName": "THRIVE ABIA LIMITED",
  "registrationNumber": "RC1234567",
  "registrationDate": "2025-01-20",
  "businessType": "Private Company Limited by Shares"
}

If a field cannot be read, return null.
Do not guess.
`,
            },

            {
              type: "image_url",
              image_url: {
                url: 'https://icrp.cac.gov.ng/assets/img/site/e-certificate/CERTIFICATE%20-%20TEST%20FOUNDATION.jpg',
              },
            },
          ],
        },
      ],
    }),
  }
);

const data = await response.json();

console.log(data.choices[0].message.content);

console.log(data);
  return (
    <div>
      test
    </div>
  )
}
