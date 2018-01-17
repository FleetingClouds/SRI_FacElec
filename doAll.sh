yarn clean

# rm -fr services/authenticator/node_modules

yarn || exit;

pushd app
yarn || exit;
popd

yarn lint || exit;
# yarn flow || exit;
yarn package || exit;
yarn test || exit;
yarn test-e2e || exit;
