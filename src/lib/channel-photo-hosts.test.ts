import { resolveChannelPhotoRemoteHostnames } from "./channel-photo-hosts";

describe("resolveChannelPhotoRemoteHostnames", () => {
  it("allows the real staging channel photo bucket hostname by default", () => {
    expect(
      resolveChannelPhotoRemoteHostnames({
        awsRegion: "eu-central-1",
      })
    ).toContain("tragram-channel-photos-staging-265742305340.s3.eu-central-1.amazonaws.com");
  });

  it("allows bucket names provided by deployment env", () => {
    expect(
      resolveChannelPhotoRemoteHostnames({
        awsRegion: "eu-central-1",
        bucketNames: ["custom-bucket"],
      })
    ).toContain("custom-bucket.s3.eu-central-1.amazonaws.com");
  });

  it("allows explicit remote hosts and strips URL wrappers", () => {
    expect(
      resolveChannelPhotoRemoteHostnames({
        awsRegion: "eu-central-1",
        remoteHosts: ["https://images.example.com/path"],
      })
    ).toContain("images.example.com");
  });
});
