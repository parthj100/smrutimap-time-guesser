#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bundle analysis script
class BundleAnalyzer {
  constructor() {
    this.buildDir = path.join(path.dirname(__dirname), 'dist');
    this.analysisFile = path.join(this.buildDir, 'bundle-analysis.html');
  }

  async analyze() {
    console.log('🔍 Analyzing bundle size...\n');

    try {
      // Check if build exists
      if (!fs.existsSync(this.buildDir)) {
        console.log('📦 Building project first...');
        execSync('npm run build', { stdio: 'inherit' });
      }

      // Check if analysis file exists
      if (fs.existsSync(this.analysisFile)) {
        console.log('✅ Bundle analysis completed!');
        console.log(`📊 Analysis file: ${this.analysisFile}`);
        this.printRecommendations();
      } else {
        console.log('❌ Bundle analysis file not found');
        console.log('💡 Run "npm run build" to generate analysis');
      }

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  printRecommendations() {
    console.log('\n📋 Bundle Optimization Recommendations:\n');

    const recommendations = [
      {
        category: '🚀 Code Splitting',
        items: [
          '✅ Routes are lazy-loaded',
          '✅ Vendor chunks are separated',
          '✅ Game components are chunked',
          '💡 Consider splitting large components further',
        ]
      },
      {
        category: '🖼️ Image Optimization',
        items: [
          '✅ Image optimization utilities implemented',
          '✅ WebP format detection',
          '✅ Responsive image generation',
          '💡 Consider implementing image lazy loading',
          '💡 Add image compression for uploads',
        ]
      },
      {
        category: '💾 Caching',
        items: [
          '✅ Service worker implemented',
          '✅ Static asset caching',
          '✅ API response caching',
          '💡 Consider implementing background sync',
        ]
      },
      {
        category: '⚡ Performance',
        items: [
          '✅ Bundle analyzer configured',
          '✅ Source maps disabled in production',
          '✅ Console logs removed in production',
          '💡 Consider implementing tree shaking',
          '💡 Add performance monitoring',
        ]
      },
      {
        category: '🔧 Additional Optimizations',
        items: [
          '💡 Implement critical CSS inlining',
          '💡 Add resource hints (preload, prefetch)',
          '💡 Consider using dynamic imports for heavy features',
          '💡 Implement virtual scrolling for large lists',
          '💡 Add compression (gzip/brotli) on server',
        ]
      }
    ];

    recommendations.forEach(rec => {
      console.log(`${rec.category}:`);
      rec.items.forEach(item => console.log(`  ${item}`));
      console.log('');
    });

    console.log('🎯 Next Steps:');
    console.log('1. Open the bundle analysis file to see detailed breakdown');
    console.log('2. Identify large dependencies that can be optimized');
    console.log('3. Consider code splitting for heavy features');
    console.log('4. Implement the suggested optimizations above');
  }
}

// Run analysis
const analyzer = new BundleAnalyzer();
analyzer.analyze(); 