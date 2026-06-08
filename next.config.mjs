/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,


 
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',

      },
      {
        // Dev seed (scripts/seed.mjs) uses picsum.photos for placeholder
        // product images. Add more hosts here as the project needs them.
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      
      },
    ],
  },

};

export default nextConfig;
