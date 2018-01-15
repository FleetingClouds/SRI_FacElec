rmdir node_modules /S /Q
rmdir node_modules /S /Q
rmdir release /S /Q
call yarn

cd app
call yarn
cd ..

call yarn lint
call yarn flow
call yarn package
call yarn test
call yarn test-e2e
