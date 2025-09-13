import React from 'react';

const BlueCarbonPage = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-green-800 to-blue-700 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-blue-200">Blue</span> <span className="text-green-200">Carbon</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              The Ocean's Natural Solution to Climate Change
            </p>
          </div>
        </div>
      </section>

      {/* What is Blue Carbon */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What is Blue Carbon?</h2>
              <p className="text-lg text-gray-600 mb-6">
                Blue carbon refers to carbon captured and stored by coastal and marine ecosystems. 
                These ecosystems are among the most efficient carbon sinks on Earth, storing carbon 
                for thousands of years in their soils and biomass.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Unlike terrestrial forests, blue carbon ecosystems store most of their carbon below 
                ground in waterlogged soils, making them more stable and long-term carbon stores.
              </p>
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Benefits</h3>
                <ul className="space-y-2">
                  <li className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    High carbon sequestration rates
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Long-term carbon storage
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Biodiversity conservation
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Coastal protection
                  </li>
                </ul>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-green-100 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Carbon Storage Comparison</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Mangroves</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">3-5x</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Seagrass</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">2-3x</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-600 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Salt Marshes</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">2x</span>
                </div>
                <div className="text-center text-sm text-gray-600 mt-4">
                  More carbon per hectare than terrestrial forests
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Types */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Blue Carbon Ecosystems</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three main types of coastal ecosystems that play a crucial role in carbon sequestration
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Mangroves</h3>
                <p className="text-gray-600 mb-4">
                  Coastal forests that grow in saltwater, storing massive amounts of carbon in their 
                  dense root systems and soil.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carbon Storage:</span>
                    <span className="font-semibold text-green-600">1,000+ tCO2/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Global Coverage:</span>
                    <span className="font-semibold">15M hectares</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Seagrass Meadows</h3>
                <p className="text-gray-600 mb-4">
                  Underwater flowering plants that form dense meadows, capturing carbon in their 
                  extensive root systems.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carbon Storage:</span>
                    <span className="font-semibold text-blue-600">500+ tCO2/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Global Coverage:</span>
                    <span className="font-semibold">18M hectares</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Salt Marshes</h3>
                <p className="text-gray-600 mb-4">
                  Coastal wetlands that are regularly flooded by tides, storing carbon in their 
                  waterlogged soils for millennia.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carbon Storage:</span>
                    <span className="font-semibold text-purple-600">800+ tCO2/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Global Coverage:</span>
                    <span className="font-semibold">5M hectares</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Research */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">NCCR's Blue Carbon Research</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our cutting-edge research is advancing the understanding and application of blue carbon solutions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2 2a1 1 0 000 2h6a1 1 0 100-2H5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Ecosystem Monitoring</h3>
              <p className="text-gray-600 mb-4">
                Advanced satellite and field monitoring systems to track carbon sequestration rates, 
                ecosystem health, and restoration progress in real-time.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Remote sensing and GIS analysis</li>
                <li>• In-situ carbon measurement</li>
                <li>• Biodiversity assessment</li>
                <li>• Climate impact modeling</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Carbon Credit Innovation</h3>
              <p className="text-gray-600 mb-4">
                Pioneering blockchain-based carbon credit systems that ensure transparency, 
                traceability, and verifiable carbon sequestration outcomes.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Smart contract automation</li>
                <li>• Transparent trading platform</li>
                <li>• Automated verification</li>
                <li>• Digital certificates</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlueCarbonPage;
