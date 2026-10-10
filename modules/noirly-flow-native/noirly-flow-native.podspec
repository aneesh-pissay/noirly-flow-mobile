require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "noirly-flow-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.license      = { :type => package["license"] }
  s.authors      = "Noirly"
  s.homepage     = "https://noirly.flow.aneesh-pissay.in"
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/noirly-dev/NoirlyFlow.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm}"

  install_modules_dependencies(s)
end
