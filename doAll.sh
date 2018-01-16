yarn clean

# rm -fr services/authenticator/node_modules

yarn

pushd app
yarn
popd

yarn lint || exit;
yarn flow || exit;
yarn package || exit;
yarn test || exit;
yarn test-e2e || exit;
