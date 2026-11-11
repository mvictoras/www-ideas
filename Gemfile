source 'https://rubygems.org'

gem 'jekyll'

# Core plugins that directly affect site building
group :jekyll_plugins do
    gem 'jekyll-3rd-party-libraries'
    gem 'jekyll-cache-bust'
    gem 'jekyll-email-protect'
    gem 'jekyll-feed'
    gem 'jekyll-imagemagick'
    gem 'jekyll-link-attributes'
    gem 'jekyll-minifier'
    gem 'jekyll-regex-replace'
    gem 'jekyll-scholar'
    gem 'jekyll-sitemap'
    gem 'jekyll-socials' # tag referenced by the theme header; render is off
    gem 'jekyll-tabs'
    gem 'jekyll-toc'
    gem 'jemoji'
end

# Gems for development or external data fetching (outside :jekyll_plugins)
group :other_plugins do
    gem 'observer'       # used by jekyll-scholar
    gem 'ostruct'        # used by jekyll-scholar
end

# Gems for al-folio plugins
group :al_folio_plugins do
    gem 'al_folio_core', '= 1.0.15'
    gem 'al_icons', '= 1.0.0'
    gem 'al_folio_upgrade', '= 1.0.3'
    gem 'al_folio_bootstrap_compat', '= 1.0.0'

    gem 'al_citations', '= 1.0.1'
    gem 'al_img_tools', '= 1.0.3'
    gem 'al_search', '= 1.0.3'
    gem 'al_math', '= 1.0.2'

    gem 'al_email_protect', '= 1.0.1'
end

# Site test harness
group :test do
    gem 'html-proofer'
end
