in docs
bundle install
bundle exec jekyll serve

changes are automatically deployed when pushed
lsof -ti:4000 | xargs kill -9