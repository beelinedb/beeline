const assert = require("assert");
const { execSync } = require("child_process");

describe("Ill Formatted Config File", function () {
  it("show return", function () {
    try {
      execSync("./beeline info --config ./config/config.bad.yaml");
      assert(false);
    } catch (error) {
      const re =
        /Implicit keys need to be on a single line at line 1, column 1:[\n\s]+url asdf/;
      assert(re.test(error.message));
    }
  });
});

describe("Info", function () {
  describe("Database not found", function () {
    it("should report error", function () {
      try {
        const res = execSync(
          "./beeline info --config ./config/config.bad-db.yaml"
        );
        assert(false);
      } catch (error) {
        const re = /database "netscans" does not exist/;

        assert(re.test(error.message));
      }
    });
  });

  describe("Print schema history", function () {
    it("should display the schema history", function () {
      const res = execSync("./beeline info --config ./config/config.yaml");
      console.log(res);
      assert(true);
    });
  });
});
